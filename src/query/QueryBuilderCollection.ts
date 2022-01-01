import { Filter, filters } from "../tools/Filters.ts";
import { IIndexesDesc } from "../types.d.ts";
import { QueryBuilderSingle } from "./QueryBuilderSingle.ts";
import { QUERY_BUILDER_INTERNAL } from "./utils.ts";
import { PageAddr } from "../PageAddr.ts";
import {
  Direction,
  Traverser,
  GetTraverser,
  QueryBuilderParentRef,
} from "./utils.ts";

export class QueryBuilderCollection<T, IdxDesc extends IIndexesDesc> {
  private readonly parent: QueryBuilderParentRef<T>;

  [QUERY_BUILDER_INTERNAL]: GetTraverser<T>;

  constructor(parent: QueryBuilderParentRef<T>, getTraverser: GetTraverser<T>) {
    this.parent = parent;
    this[QUERY_BUILDER_INTERNAL] = getTraverser;
  }

  private getTraverser(): Traverser<T> {
    return this[QUERY_BUILDER_INTERNAL]();
  }

  offsetByCount(offset: number): QueryBuilderCollection<T, IdxDesc> {
    return new QueryBuilderCollection<T, IdxDesc>(this.parent, () => {
      const traverser = this.getTraverser();
      let currentOffset = 0;
      let ended = false;
      return () => {
        if (ended) {
          return null;
        }
        while (currentOffset < offset) {
          const res = traverser();
          if (res === null) {
            ended = true;
            return null;
          }
          currentOffset++;
        }
        return traverser();
      };
    });
  }

  offsetByAddr(addr: PageAddr): QueryBuilderCollection<T, IdxDesc> {
    return new QueryBuilderCollection<T, IdxDesc>(this.parent, () => {
      const traverser = this.getTraverser();
      let found = false;
      let ended = false;
      return () => {
        if (ended) {
          return null;
        }
        while (found === false) {
          const res = traverser();
          if (res === null) {
            ended = true;
            return null;
          }
          if (res.addr === addr.addr) {
            found = true;
          }
          return traverser();
        }
        return traverser();
      };
    });
  }

  limit(limit: number): QueryBuilderCollection<T, IdxDesc> {
    return new QueryBuilderCollection<T, IdxDesc>(this.parent, () => {
      const traverser = this.getTraverser();
      let count = 0;
      let ended = false;
      return () => {
        if (ended) {
          return null;
        }
        if (count >= limit) {
          return null;
        }
        const res = traverser();
        if (res === null) {
          ended = true;
          return null;
        }
        count++;
        return traverser();
      };
    });
  }

  filter<N extends keyof IdxDesc>(
    _indexName: N,
    _filter: Filter<IdxDesc[N]>
  ): QueryBuilderCollection<T, IdxDesc> {
    throw new Error("Not Implemented");
  }

  filterEqual<N extends keyof IdxDesc>(
    indexName: N,
    value: IdxDesc[N]
  ): QueryBuilderCollection<T, IdxDesc> {
    return this.filter(indexName, filters.equal(value));
  }

  sortBy<N extends keyof IdxDesc>(
    _indexName: N,
    _direction?: Direction
  ): QueryBuilderCollection<T, IdxDesc> {
    throw new Error("Not Implemented");
  }

  dynamicFilter(_fn: (val: T) => boolean): QueryBuilderCollection<T, IdxDesc> {
    throw new Error("Not Implemented");
  }

  dynamicSort(
    _fn: (left: T, right: T) => number
  ): QueryBuilderCollection<T, IdxDesc> {
    throw new Error("Not Implemented");
  }

  transform<Out>(_fn: (item: T) => Out): QueryBuilderCollection<Out, IdxDesc> {
    throw new Error("Not Implemented");
  }

  // throw if more count is not one
  one(): QueryBuilderSingle<T, false> {
    const traverser = this.getTraverser();
    const first = traverser();
    if (first === null) {
      throw new Error(`.one() expected one, received none`);
    }
    const second = traverser();
    if (second !== null) {
      throw new Error(`.one() expected one, received more`);
    }
    return new QueryBuilderSingle<T, false>(
      this.parent,
      first.addr,
      first.data
    );
  }

  // throw if count > 1
  maybeOne(): QueryBuilderSingle<T, true> {
    const traverser = this.getTraverser();
    const first = traverser();
    if (first === null) {
      return new QueryBuilderSingle<T, true>(this.parent, null, null);
    }
    const second = traverser();
    if (second !== null) {
      throw new Error(`.maybeOne() expected one, received more`);
    }
    return new QueryBuilderSingle<T, true>(this.parent, first.addr, first.data);
  }

  // throw if count < 1
  first(): QueryBuilderSingle<T, false> {
    const traverser = this.getTraverser();
    const first = traverser();
    if (first === null) {
      throw new Error(`.first() expected at least one, received none`);
    }
    return new QueryBuilderSingle<T, false>(
      this.parent,
      first.addr,
      first.data
    );
  }

  // never throw
  maybeFirst(): QueryBuilderSingle<T, true> {
    const traverser = this.getTraverser();
    const first = traverser();
    if (first === null) {
      return new QueryBuilderSingle<T, true>(this.parent, null, null);
    }
    return new QueryBuilderSingle<T, true>(this.parent, first.addr, first.data);
  }

  update(_fn: (item: T) => T): this {
    throw new Error("Not Implemented");
  }

  delete(): this {
    throw new Error("Not Implemented");
  }

  valuesArray(): Array<T> {
    return Array.from(this.values());
  }

  values(): Iterable<T> {
    return {
      [Symbol.iterator]: () => {
        const traverser = this.getTraverser();
        let nextRes = traverser();
        return {
          next: (): IteratorResult<T> => {
            if (nextRes === null) {
              return { done: true, value: undefined };
            }
            const nextNextRes = traverser();
            const data = nextRes.data ?? {
              inner: this.parent.getData(nextRes.addr),
            };
            const result: IteratorResult<T> = {
              done: nextNextRes === null ? undefined : false,
              value: data.inner,
            };
            nextRes = nextNextRes;
            return result;
          },
        };
      },
    };
  }

  entriesArray(): Array<[PageAddr, T]> {
    return Array.from(this.entries());
  }

  entries(): Iterable<[PageAddr, T]> {
    return {
      [Symbol.iterator]: () => {
        const traverser = this.getTraverser();
        let nextRes = traverser();
        return {
          next: (): IteratorResult<[PageAddr, T]> => {
            if (nextRes === null) {
              return { done: true, value: undefined };
            }
            const nextNextRes = traverser();
            const data = nextRes.data ?? {
              inner: this.parent.getData(nextRes.addr),
            };
            const result: IteratorResult<[PageAddr, T]> = {
              done: nextNextRes === null ? undefined : false,
              value: [new PageAddr(nextRes.addr), data.inner],
            };
            nextRes = nextNextRes;
            return result;
          },
        };
      },
    };
  }

  keysArray(): Array<PageAddr> {
    return Array.from(this.keys());
  }

  keys(): Iterable<PageAddr> {
    return {
      [Symbol.iterator]: () => {
        const traverser = this.getTraverser();
        let nextRes = traverser();
        return {
          next: (): IteratorResult<PageAddr> => {
            if (nextRes === null) {
              return { done: true, value: undefined };
            }
            const nextNextRes = traverser();
            const result: IteratorResult<PageAddr> = {
              done: nextNextRes === null ? undefined : false,
              value: new PageAddr(nextRes.addr),
            };
            nextRes = nextNextRes;
            return result;
          },
        };
      },
    };
  }
}
