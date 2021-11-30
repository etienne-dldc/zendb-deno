import { PagedFile, Page, extname } from "../deps.ts";
import { LeastRecentlyUsedMap } from "./LeastRecentlyUsedMap.ts";
import { Comparable } from "./Comparable.ts";
import { DataItemPage } from "./pages/DataItemPage.ts";
import { DataListPage } from "./pages/DataListPage.ts";
import { StorageRootPage } from "./pages/StorageRootPage.ts";
import { StoragePageAny } from "./pages/utils.ts";
import { PageAddr, RawPageAddr } from "./PageAddr.ts";
import { QueryBuilderRoot } from "./query/QueryBuilderRoot.ts";
import { QueryBuilderParentRef } from "./query/utils.ts";
import { IIndexesDesc, IIndexFn, IIndexObj, IIndexes } from "./types.d.ts";
import { ZenDBIndexes } from "./ZenDBIndexes.ts";

export type ZenDBOptions = {
  pageSize?: number;
  cacheSize?: number;
  create?: boolean;
  indexesPath?: string;
  indexesPageSize?: number;
  indexesCacheSize?: number;
  createIndexes?: boolean;
  indexesTreeOrder?: number;
};

export class ZenDB<T, IndexesDesc extends IIndexesDesc> {
  public static unique<T, Out extends Comparable>(
    key: IIndexFn<T, Out>
  ): IIndexObj<T, Out> {
    return { unique: true, key };
  }

  private readonly file: PagedFile;
  private readonly indexes: ZenDBIndexes<T, IndexesDesc>;
  private readonly nodesCache = new LeastRecentlyUsedMap<
    number,
    StoragePageAny
  >();

  private readonly queryBuilderParentRef: QueryBuilderParentRef<T>;

  constructor(
    path: string,
    indexes: IIndexes<T, IndexesDesc>,
    {
      cacheSize,
      pageSize,
      create,
      indexesPath,
      createIndexes,
      indexesCacheSize,
      indexesPageSize,
      indexesTreeOrder,
    }: ZenDBOptions = {}
  ) {
    this.file = new PagedFile(path, {
      cacheSize,
      pageSize,
      create,
    });
    const fileExt = extname(path);
    const filePathBase = path.slice(0, path.length - fileExt.length);
    const indexPathResolved =
      indexesPath ?? filePathBase + ".indexes" + fileExt;
    this.indexes = new ZenDBIndexes(indexPathResolved, indexes, {
      cacheSize: indexesCacheSize,
      pageSize: indexesPageSize,
      create: createIndexes,
      treeOrder: indexesTreeOrder,
    });
    this.queryBuilderParentRef = {
      getData: this.getData.bind(this),
      insertInternal: this.insertInternal.bind(this),
      deleteInternal: this.deleteInternal.bind(this),
      updateInternal: this.updateInternal.bind(this),
    };
    if (this.file.size > 0 && this.indexes.empty) {
      // file exists but indexes are empty
      // => populate indexes
      const list = this.getDataListPage();
      list.forEach((addr) => {
        this.indexes.insert(addr, this.getData(addr));
      });
    }
  }

  public insert(value: T): PageAddr {
    return this.query().insertOne(value).key();
  }

  public save() {
    this.file.save();
    this.indexes.save();
  }

  public close() {
    this.file.close();
    this.indexes.close();
  }

  public query(): QueryBuilderRoot<T, IndexesDesc> {
    setTimeout(() => {
      console.log("TODO: Cleanup cache after Query ??");
    }, 0);
    return new QueryBuilderRoot(this.queryBuilderParentRef);
  }

  public debug() {
    const list = this.getDataListPage();
    const all = list.getAll();
    console.info(`Items (${all.length})`);
    all.forEach((addr) => {
      const data = this.getDataItemPage(addr);
      console.info(`- ${addr}: ${JSON.stringify(data.data)}`);
    });
  }

  // PRIVATE

  private insertInternal(value: T): RawPageAddr {
    const mana = this.file.createManager();
    const itemSubPage = mana.createPage();
    const itemPage = new DataItemPage(itemSubPage);
    itemPage.data = value;
    const list = this.getDataListPage();
    list.add(itemPage.addr);
    this.indexes.insert(itemPage.addr, value);
    return itemPage.addr;
  }

  private deleteInternal(_addr: RawPageAddr): void {
    // const
  }

  private updateInternal(
    _addr: RawPageAddr,
    _update: T | ((obj: T) => T)
  ): void {
    throw new Error("Not Implemented");
  }

  private getData(addr: RawPageAddr): T {
    return this.getDataItemPage(addr).data;
  }

  private getDataItemPage(addr: RawPageAddr): DataItemPage {
    return this.getPage(addr, (page) => new DataItemPage(page));
  }

  private getRootPage(): StorageRootPage {
    return this.getPage(0, (page) => {
      if (page.isRoot === false) {
        throw new Error(`Expected root page`);
      }
      const fileIsEmpty = this.file.size === 0;
      const root = new StorageRootPage(page, fileIsEmpty);
      if (fileIsEmpty) {
        const itemsInternalPage = this.file.createPage();
        const itemsPage = new DataListPage(itemsInternalPage);
        root.data = { items: itemsPage.addr };
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

  private getPage<T extends StoragePageAny>(
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
}
