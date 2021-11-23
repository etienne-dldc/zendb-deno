// deno-lint-ignore-file no-explicit-any
import { PagedFile, Page } from "../deps.ts";
import { LeastRecentlyUsedMap } from "./LeastRecentlyUsedMap.ts";
import { Comparable, compareOrder } from "./compare.ts";
import { DataItemPage } from "./pages/DataItemPage.ts";
import { DataListPage } from "./pages/DataListPage.ts";
import { IndexInternalPage } from "./pages/IndexInternalPage.ts";
import {
  IndexLeafPage,
  IndexLeafData,
  IndexLeafDataTuple,
} from "./pages/IndexLeafPage.ts";
import { RootDataIndex, RootPage } from "./pages/RootPage.ts";
import { PageAny, PageAddr, IndexPage, PageType } from "./pages/utils.ts";
import {
  QueryBuilderFnResult,
  QueryBuilder,
  QueryBuilderResult,
} from "./QueryBuilder.ts";
import {
  IIndexesDesc,
  IIndexFn,
  IIndexObj,
  IIndexResolved,
  IIndexes,
  IIndex,
} from "./types.d.ts";

export type InsertResult = null | {
  type: "splitted";
  orphanPage: IndexPage;
  orphanFirstKey: Comparable;
};

export type ZenDBOptions = {
  pageSize?: number;
  cacheSize?: number;
  create?: boolean;
  treeOrder?: number;
};

export class ZenDB<T, IndexesDesc extends IIndexesDesc> {
  public static unique<T, Out extends Comparable>(
    fn: IIndexFn<T, Out>
  ): IIndexObj<T, Out> {
    return { unique: true, fn };
  }

  private file: PagedFile;
  private nodesCache = new LeastRecentlyUsedMap<number, PageAny>();
  private indexes: {
    [K in keyof IndexesDesc]: IIndexResolved<T, IndexesDesc[K]>;
  };

  constructor(
    path: string,
    indexes: IIndexes<T, IndexesDesc>,
    { cacheSize, pageSize, create, treeOrder = 20 }: ZenDBOptions = {}
  ) {
    this.file = new PagedFile(path, {
      cacheSize,
      pageSize,
      create,
    });
    this.indexes = Object.fromEntries(
      Object.entries<IIndex<T, any>>(indexes).map(
        ([indexName, def]): [string, IIndexResolved<T, any>] => {
          return [
            indexName,
            typeof def === "function"
              ? { unique: false, treeOrder, fn: def }
              : { unique: false, treeOrder, ...def },
          ];
        }
      )
    ) as any;
  }

  public insert(value: T): void {
    const mana = this.file.createManager();
    const itemSubPage = mana.createPage();
    const itemPage = new DataItemPage(itemSubPage);
    itemPage.data = value;
    const list = this.getDataListPage();
    list.add(itemPage.addr);
    const indexesEntries = Object.entries<IIndexResolved<T, any>>(this.indexes);
    for (const [indexName, indexDef] of indexesEntries) {
      const key = indexDef.fn(value);
      this.insertInIndex(indexName, key, itemPage.addr);
    }
  }

  public save() {
    this.file.save();
  }

  public close() {
    this.file.close();
  }

  public query<Out extends QueryBuilderFnResult<IndexesDesc>>(
    _fn: (builder: QueryBuilder<T, IndexesDesc>) => Out
  ): Out extends QueryBuilderResult<infer Res> ? Res : void {
    throw new Error("Not implemented");
  }

  public debug() {
    const list = this.getDataListPage();
    const all = list.getAll();
    console.info(`Items (${all.length})`);
    all.forEach((addr) => {
      const data = this.getDataItemPage(addr);
      console.info(`- ${addr}: ${JSON.stringify(data.data)}`);
    });
    const indexesEntries = Object.entries<IIndexResolved<T, any>>(this.indexes);
    const root = this.getRootPage();
    for (const [indexName, indefDef] of indexesEntries) {
      const indexTree = this.getIndexPage(
        root.data.indexes[indexName].addr,
        indefDef.treeOrder
      );
      this.debugIndexPage(
        indexTree,
        "  ",
        `\nIndex: ${indexName}${indefDef.unique ? "(unique)" : ""} `
      );
    }
  }

  // PRIVATE

  private debugIndexPage(
    page: IndexPage,
    prefix: string,
    headPrefix: string = prefix
  ): void {
    if (page instanceof IndexLeafPage) {
      console.info(
        headPrefix + `Leaf [${page.addr}] ${page.isRoot ? "(root)" : ""}`
      );
      page.data.forEach(([key, value]) => {
        console.info(
          prefix +
            `- ${String(key)}: ${
              Array.isArray(value) ? `[${value.join(", ")}]` : value
            }`
        );
      });
      return;
    }
    if (page instanceof IndexInternalPage) {
      console.info(
        headPrefix + `Internal [${page.addr}] ${page.isRoot ? "(root)" : ""}`
      );
      const [headChild, items] = page.data;
      this.debugIndexPage(
        this.getIndexPage(headChild, page.order),
        prefix + "   ",
        prefix + ` • `
      );
      items.forEach(([key, child]) => {
        console.info(prefix + ` • Key: ${String(key)}`);
        this.debugIndexPage(
          this.getIndexPage(child, page.order),
          prefix + "   ",
          prefix + ` • `
        );
      });
      return;
    }
    throw new Error("Unhandled type");
  }

  private getDataItemPage(addr: number): DataItemPage {
    return this.getPage(addr, (page) => new DataItemPage(page));
  }

  private getRootPage() {
    return this.getPage(0, (page) => {
      if (page.isRoot === false) {
        throw new Error(`Expected root page`);
      }
      const fileIsEmpty = this.file.size === 0;
      const root = new RootPage(page, fileIsEmpty);
      if (fileIsEmpty) {
        const itemsInternalPage = this.file.createPage();
        const itemsPage = new DataListPage(itemsInternalPage);
        const indexes: Record<keyof IndexesDesc, RootDataIndex> = {} as any;
        for (const [indexName, indexObj] of Object.entries<
          IIndexResolved<T, any>
        >(this.indexes)) {
          const treeRootPage = this.file.createPage();
          const tree = new IndexLeafPage(
            treeRootPage,
            indexObj.treeOrder,
            indexObj.unique
          );
          indexes[indexName as keyof IndexesDesc] = {
            addr: tree.addr,
            order: indexObj.treeOrder,
            unique: indexObj.unique,
          };
        }
        root.data = { items: itemsPage.addr, indexes: indexes };
      }
      return root;
    });
  }

  private getDataListPage(): DataListPage {
    const root = this.getRootPage();
    return this.getPage(root.data.items, (page) => {
      return new DataListPage(page);
    });
  }

  private getIndexLeafPage(
    addr: PageAddr,
    order: number,
    unique: boolean
  ): IndexLeafPage {
    return this.getPage(addr, (page) => {
      return new IndexLeafPage(page, order, unique);
    });
  }

  private getPage<T extends PageAny>(
    addr: number,
    createNode: (page: Page) => T
  ): T {
    const cached = this.nodesCache.get(addr);
    if (cached && cached.closed === false) {
      return cached as T;
    }
    const page =
      addr === 0 ? this.file.getRootPage() : this.file.getPage(addr, null);
    const node = createNode(page);
    this.nodesCache.set(addr, node);
    return node;
  }

  private getIndexPage(addr: number, order: number): IndexPage {
    return this.getPage(addr, (page) => {
      if (page.type === PageType.IndexInternal) {
        return new IndexInternalPage(page, order);
      }
      if (page.type === PageType.IndexLeaf) {
        return new IndexLeafPage(page, order, false);
      }
      if (page.type === PageType.IndexUniqueLeaf) {
        return new IndexLeafPage(page, order, true);
      }
      throw new Error(`Unexpected page type`);
    });
  }

  private insertInIndex(
    indexName: keyof IndexesDesc,
    key: Comparable,
    value: PageAddr
  ) {
    const root = this.getRootPage();
    const rootData = root.data;
    const indexObj = rootData.indexes[indexName as string];
    const treeRoot = this.getIndexPage(indexObj.addr, indexObj.order);
    const result = this.insertInIndexPage(treeRoot, key, value);
    if (result === null) {
      return;
    }
    if (result.type === "splitted") {
      // root splitted => create new root
      const newRoot = new IndexInternalPage(
        this.file.createPage(),
        indexObj.order
      );
      newRoot.data = [
        treeRoot.addr,
        [[result.orphanFirstKey, result.orphanPage.addr]],
      ];
      treeRoot.parent = newRoot.addr;
      result.orphanPage.parent = newRoot.addr;
      // update root index addr
      root.data = {
        ...rootData,
        indexes: {
          ...rootData.indexes,
          [indexName as string]: {
            ...rootData.indexes[indexName as string],
            addr: newRoot.addr,
          },
        },
      };
      return;
    }
    throw new Error("Unexpected");
  }

  private insertInIndexPage(
    page: IndexPage,
    key: Comparable,
    value: PageAddr
  ): InsertResult {
    if (page instanceof IndexLeafPage) {
      return this.insertInIndexLeafPage(page, key, value);
    }
    return this.insertInIndexInternalPage(page, key, value);
  }

  private insertInIndexLeafPage(
    page: IndexLeafPage,
    key: Comparable,
    addr: PageAddr
  ): InsertResult {
    const data = page.data;
    const existsIndex = data.findIndex(([k]) => compareOrder(k, "equal", key));
    if (existsIndex >= 0) {
      // add to existing leaf item
      const exists = data[existsIndex];
      if (page.unique) {
        throw new Error(`Unique error`);
      }
      const dataCopy = data.slice();
      const currentList = exists[1] as Array<number>;
      if (currentList.includes(addr)) {
        throw new Error(`Addr already in index ?`);
      }
      dataCopy[existsIndex] = [
        exists[0],
        this.insertInAddrList(currentList, addr),
      ];
      page.data = dataCopy;
      // nothing more to do
      return null;
    }
    // insert
    const insertItem: IndexLeafDataTuple = [key, page.unique ? addr : [addr]];
    const newItems = this.insertInLeafData(data, insertItem, page.isRoot);
    if (newItems.length <= page.maxKeys) {
      // no overflow
      page.data = newItems;
      return null;
    }
    // need to split
    const midIndex = Math.floor(newItems.length / 2);
    const leftItems = newItems.slice(0, midIndex);
    const rightItems = newItems.slice(midIndex);
    const orphanPage = new IndexLeafPage(
      this.file.createPage(),
      page.order,
      page.unique
    );
    const nextSibling = this.getIndexLeafPage(
      page.nextSibling,
      page.order,
      page.unique
    );
    orphanPage.data = rightItems;
    page.data = leftItems;
    orphanPage.prevSibling = page.addr;
    orphanPage.nextSibling = page.nextSibling;
    page.nextSibling = orphanPage.addr;
    nextSibling.prevSibling = orphanPage.addr;
    return {
      type: "splitted",
      orphanPage,
      orphanFirstKey: rightItems[0][0],
    };
  }

  private insertInIndexInternalPage(
    page: IndexInternalPage,
    key: Comparable,
    addr: PageAddr
  ): InsertResult {
    const sub = page.findChild(key);
    const subTree = this.getIndexPage(sub.addr, page.order);
    const res = this.insertInIndexPage(subTree, key, addr);
    if (res === null) {
      return null;
    }
    if (res.type === "splitted") {
      const [headChild, items] = page.data;
      const newtItems = items.slice();
      newtItems.splice(sub.index + 1, 0, [
        res.orphanFirstKey,
        res.orphanPage.addr,
      ]);
      res.orphanPage.parent = page.addr;
      if (newtItems.length <= page.maxKeys) {
        // no overflow
        page.data = [headChild, newtItems];
        return null;
      }
      // split
      const midIndex = Math.floor(newtItems.length / 2); // offset by -1 for headChild
      const leftItems = newtItems.slice(0, midIndex);
      const midItem = newtItems[midIndex];
      const rightItems = newtItems.slice(midIndex + 1);
      const orphanPage = new IndexInternalPage(
        this.file.createPage(),
        page.order
      );
      orphanPage.data = [midItem[1], rightItems];
      page.data = [headChild, leftItems];
      return {
        type: "splitted",
        orphanPage: orphanPage,
        orphanFirstKey: midItem[0],
      };
    }
    throw new Error("Unexpected");
  }

  private insertInAddrList(
    list: Array<PageAddr>,
    addr: PageAddr
  ): Array<PageAddr> {
    const copy: Array<number> = [];
    let inserted = false;
    for (const a of list) {
      if (!inserted) {
        const diff = a - addr;
        if (diff > 0) {
          inserted = true;
          copy.push(addr);
        }
      }
      copy.push(a);
    }
    if (!inserted) {
      copy.push(addr);
    }
    return copy;
  }

  private insertInLeafData(
    data: IndexLeafData,
    newItem: IndexLeafDataTuple,
    isRoot: boolean
  ): IndexLeafData {
    const [newKey] = newItem;
    if (isRoot && data.length === 0) {
      return [newItem];
    }
    const firstKey = data[0][0];
    if (compareOrder(newKey, "isBefore", firstKey)) {
      return [newItem, ...data];
    }
    const updatedData: IndexLeafData = [];
    let inserted = false;
    for (const item of data) {
      if (!inserted) {
        if (compareOrder(newKey, "isBefore", item[0])) {
          inserted = true;
          updatedData.push(newItem);
        }
      }
      updatedData.push(item);
    }
    if (!inserted) {
      updatedData.push(newItem);
    }
    return updatedData;
  }
}
