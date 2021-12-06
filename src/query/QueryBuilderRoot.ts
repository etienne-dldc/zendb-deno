import { PageAddr, RawPageAddr } from "../PageAddr.ts";
import { IIndexesDesc } from "../types.d.ts";
import { QueryBuilderCollection } from "./QueryBuilderCollection.ts";
import { QueryBuilderIndex } from "./QueryBuilderIndex.ts";
import { QueryBuilderSingle } from "./QueryBuilderSingle.ts";
import {
  arrayToGetGetTraverser,
  QUERY_BUILDER_INTERNAL,
  wrap,
  QueryBuilderParentRef,
  Traverser,
  IndexSelectData,
} from "./utils.ts";

type IndexBuiderFn<V> = (builder: QueryBuilderIndex<V>) => QueryBuilderIndex<V>;

export class QueryBuilderRoot<T, IdxDesc extends IIndexesDesc> {
  private readonly parent: QueryBuilderParentRef<T>;

  constructor(parent: QueryBuilderParentRef<T>) {
    this.parent = parent;
  }

  insertOne(obj: T): QueryBuilderSingle<T, false> {
    const addr = this.parent.insertInternal(obj);
    return new QueryBuilderSingle(this.parent, addr, wrap(obj));
  }

  insertMany(...objs: Array<T>): QueryBuilderCollection<T, IdxDesc> {
    const items: Array<RawPageAddr> = [];
    for (const obj of objs) {
      const addr = this.parent.insertInternal(obj);
      items.push(addr);
    }
    return new QueryBuilderCollection<T, IdxDesc>(
      this.parent,
      arrayToGetGetTraverser(items)
    );
  }

  union<L, R>(
    _left: QueryBuilderCollection<L, IdxDesc>,
    _right: QueryBuilderCollection<R, IdxDesc>
  ): QueryBuilderCollection<L | R, IdxDesc> {
    throw new Error("Not Implemented");
  }

  intersection<L, R>(
    _left: QueryBuilderCollection<L, IdxDesc>,
    _right: QueryBuilderCollection<R, IdxDesc>
  ): QueryBuilderCollection<L | R, IdxDesc> {
    throw new Error("Not Implemented");
  }

  select<N extends keyof IdxDesc>(
    indexName: N,
    config: IndexSelectData<IdxDesc[N]> | IndexBuiderFn<IdxDesc[N]>
  ): QueryBuilderCollection<T, IdxDesc> {
    const configResolved =
      typeof config === "function"
        ? config(new QueryBuilderIndex({}))[QUERY_BUILDER_INTERNAL]
        : config;
    return new QueryBuilderCollection<T, IdxDesc>(
      this.parent,
      this.parent.indexSelect(indexName, configResolved)
    );
  }

  selectAll(): QueryBuilderCollection<T, IdxDesc> {
    return new QueryBuilderCollection<T, IdxDesc>(
      this.parent,
      this.parent.getAllTraverser
    );
  }

  findOne(addr: PageAddr): QueryBuilderSingle<T, false> {
    // get data at this stage to throw if invalid addr
    const data = this.parent.getData(addr.addr);
    return new QueryBuilderSingle<T, false>(this.parent, addr.addr, wrap(data));
  }

  findAll(...addrs: Array<PageAddr>): QueryBuilderCollection<T, IdxDesc> {
    return new QueryBuilderCollection<T, IdxDesc>(
      this.parent,
      (): Traverser<T> => {
        let index = 0;
        return () => {
          if (index >= addrs.length) {
            return null;
          }
          index++;
          const addr = addrs[index];
          // get data at this stage to throw if invalid addr
          const data = this.parent.getData(addr.addr);
          return { addr: addr.addr, data: wrap(data) };
        };
      }
    );
  }
}
