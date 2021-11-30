// deno-lint-ignore-file no-explicit-any
import { Page, PagedFile } from "../deps.ts";
import { Comparable } from "./Comparable.ts";
import { LeastRecentlyUsedMap } from "./LeastRecentlyUsedMap.ts";
import { RawPageAddr } from "./PageAddr.ts";
import { IndexesRootPage, RootDataIndex } from "./pages/IndexesRootPage.ts";
import { IndexInternalPage } from "./pages/IndexInternalPage.ts";
import { IndexLeafPage } from "./pages/IndexLeafPage.ts";
import {
  IndexTreePage,
  IndexesPageAny,
  IndexesPageType,
} from "./pages/utils.ts";
import { treeDelete } from "./tree/treeDelete.ts";
import { treeInsert } from "./tree/treeInsert.ts";
import { TreeParentRef } from "./tree/types.d.ts";
import { IIndex, IIndexes, IIndexesDesc, IIndexResolved } from "./types.d.ts";

export type ZenDBIndexesOptions = {
  pageSize?: number;
  cacheSize?: number;
  create?: boolean;
  treeOrder?: number;
};

export class ZenDBIndexes<T, IndexesDesc extends IIndexesDesc> {
  private readonly file: PagedFile;
  private readonly treeParentRef: TreeParentRef;
  private readonly indexes: {
    [K in keyof IndexesDesc]: IIndexResolved<T, IndexesDesc[K]>;
  };
  private readonly nodesCache = new LeastRecentlyUsedMap<
    number,
    IndexesPageAny
  >();

  constructor(
    path: string,
    indexes: IIndexes<T, IndexesDesc>,
    { cacheSize, pageSize, create, treeOrder = 20 }: ZenDBIndexesOptions = {}
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
              ? { unique: false, treeOrder, key: def, filter: null }
              : {
                  unique: false,
                  treeOrder,
                  key: def.key,
                  filter: def.filter ?? null,
                },
          ];
        }
      )
    ) as any;

    this.treeParentRef = {
      deletePage: this.file.deletePage.bind(this.file),
      createPage: this.file.createPage.bind(this.file),
      getIndexLeafPage: this.getIndexLeafPage.bind(this),
      getIndexInternalPage: this.getIndexInternalPage.bind(this),
      getIndexPage: this.getIndexPage.bind(this),
    };
  }

  public get empty(): boolean {
    return this.file.size === 0;
  }

  public insert(addr: RawPageAddr, value: T): void {
    const indexesEntries = Object.entries<IIndexResolved<T, any>>(this.indexes);
    for (const [indexName, indexDef] of indexesEntries) {
      const keep = indexDef.filter ? indexDef.filter(value) : true;
      if (keep) {
        const key = indexDef.key(value);
        this.insertInIndex(indexName, key, addr);
      }
    }
  }

  public save() {
    this.file.save();
  }

  public close() {
    this.file.close();
  }

  // PRIVATE

  private getRootPage(): IndexesRootPage {
    return this.getPage(0, (page) => {
      if (page.isRoot === false) {
        throw new Error(`Expected root page`);
      }
      const fileIsEmpty = this.file.size === 0;
      const root = new IndexesRootPage(page, fileIsEmpty);
      if (fileIsEmpty) {
        const indexes: Record<keyof IndexesDesc, RootDataIndex> = {} as any;
        const indexesEntries = Object.entries<IIndexResolved<T, any>>(
          this.indexes
        );
        for (const [indexName, indexObj] of indexesEntries) {
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
        root.data = indexes;
      }
      return root;
    });
  }

  private getPage<T extends IndexesPageAny>(
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

  private insertInIndex(
    indexName: keyof IndexesDesc,
    key: Comparable,
    value: RawPageAddr
  ) {
    const root = this.getRootPage();
    const rootData = root.data;
    const indexObj = rootData[indexName as string];
    const treeRoot = this.getIndexPage(indexObj.addr, indexObj.order);
    const result = treeInsert(this.treeParentRef, treeRoot, key, value);
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
        [indexName as string]: {
          ...rootData[indexName as string],
          addr: newRoot.addr,
        },
      };
      return;
    }
    throw new Error("Unexpected");
  }

  private deleteInIndex(
    indexName: keyof IndexesDesc,
    key: Comparable,
    value: RawPageAddr
  ) {
    const root = this.getRootPage();
    const rootData = root.data;
    const indexObj = rootData[indexName as string];
    const treeRoot = this.getIndexPage(indexObj.addr, indexObj.order);
    treeDelete(this.treeParentRef, treeRoot, key, value);
  }

  private getIndexLeafPage(
    addr: RawPageAddr,
    order: number,
    unique: boolean
  ): IndexLeafPage {
    return this.getPage(addr, (page) => {
      return new IndexLeafPage(page, order, unique);
    });
  }

  private getIndexInternalPage(
    addr: RawPageAddr,
    order: number
  ): IndexInternalPage {
    return this.getPage(addr, (page) => {
      return new IndexInternalPage(page, order);
    });
  }

  private getIndexPage(addr: number, order: number): IndexTreePage {
    return this.getPage(addr, (page) => {
      if (page.type === IndexesPageType.IndexTreeInternal) {
        return new IndexInternalPage(page, order);
      }
      if (page.type === IndexesPageType.IndexTreeLeaf) {
        return new IndexLeafPage(page, order, false);
      }
      if (page.type === IndexesPageType.IndexTreeUniqueLeaf) {
        return new IndexLeafPage(page, order, true);
      }
      throw new Error(`Unexpected page type`);
    });
  }

  // private debugIndexPage(
  //   page: IndexPage,
  //   prefix: string,
  //   headPrefix: string = prefix
  // ): void {
  //   if (page instanceof IndexLeafPage) {
  //     console.info(
  //       headPrefix + `Leaf [${page.addr}] ${page.isRoot ? "(root)" : ""}`
  //     );
  //     page.data.forEach(([key, value]) => {
  //       console.info(
  //         prefix +
  //           `- ${String(key)}: ${
  //             Array.isArray(value) ? `[${value.join(", ")}]` : value
  //           }`
  //       );
  //     });
  //     return;
  //   }
  //   if (page instanceof IndexInternalPage) {
  //     console.info(
  //       headPrefix + `Internal [${page.addr}] ${page.isRoot ? "(root)" : ""}`
  //     );
  //     const [headChild, items] = page.data;
  //     this.debugIndexPage(
  //       this.getIndexPage(headChild, page.order),
  //       prefix + "   ",
  //       prefix + ` • `
  //     );
  //     items.forEach(([key, child]) => {
  //       console.info(prefix + ` • Key: ${String(key)}`);
  //       this.debugIndexPage(
  //         this.getIndexPage(child, page.order),
  //         prefix + "   ",
  //         prefix + ` • `
  //       );
  //     });
  //     return;
  //   }
  //   throw new Error("Unhandled type");
  // }
}
