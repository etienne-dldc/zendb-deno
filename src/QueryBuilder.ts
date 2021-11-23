// deno-lint-ignore-file no-explicit-any
import { Op } from "./Ops.ts";
import { IIndexesDesc } from "./types.d.ts";

export const QUERY_BUILDER_INTERNAL = Symbol("QUERY_BUILDER_INTERNAL");

export type QueryBuilderResult<T> = {
  [QUERY_BUILDER_INTERNAL]: T;
};

export interface QueryBuilder<T, IdxDesc extends IIndexesDesc> {
  offset(num: number): this;
  limit(num: number): this;

  filter<N extends keyof IdxDesc>(indexName: N, filter: Op<IdxDesc[N]>): this;
  filterEqual<N extends keyof IdxDesc>(indexName: N, value: IdxDesc[N]): this;
  sortBy<N extends keyof IdxDesc>(indexName: N, dir?: "Asc" | "Desc"): this;

  dynamicFilter(fn: (val: T) => boolean): this;
  dynamicSort(fn: (left: T, right: T) => number): this;
  dynamicTransform<Out>(fn: (item: T) => Out): QueryBuilder<Out, IdxDesc>;

  union<L, R>(
    left: QueryBuilder<L, IdxDesc>,
    right: QueryBuilder<R, IdxDesc>
  ): QueryBuilder<L | R, IdxDesc>;
  intersection<L, R>(
    left: QueryBuilder<L, IdxDesc>,
    right: QueryBuilder<R, IdxDesc>
  ): QueryBuilder<L | R, IdxDesc>;

  iterate(): QueryBuilderResult<Iterator<T>>;

  updateAll(fn: (item: T) => T): this;
  updateMaybeOne(fn: (item: T) => T): this;
  updateOne(fn: (item: T) => T): this;

  mergeAll(obj: Partial<T>): this;
  mergeMaybeOne(obj: Partial<T>): this;
  mergeOne(obj: Partial<T>): this;

  deleteAll(): this;
  deleteMaybeOne(): this;
  deleteOne(): this;

  selectAll(): QueryBuilderResult<Array<T>>;
  selectMaybeOne(): QueryBuilderResult<T | null>;
  selectOne(): QueryBuilderResult<T>;
}

export type QueryBuilderFnResult<IndexesDesc extends IIndexesDesc> =
  | QueryBuilder<any, IndexesDesc>
  | QueryBuilderResult<any>;
