// deno-lint-ignore-file no-explicit-any
import { Filter } from "../Filters.ts";
import { PageAddr, RawPageAddr } from "../PageAddr.ts";
import { ZenDB } from "../ZenDB.ts";
import { ZenDBIndexes } from "../ZenDBIndexes.ts";

export type QueryBuilderParentRef<T> = {
  insertInternal: ZenDB<T, any>["insertInternal"];
  getData: ZenDB<T, any>["getData"];
  deleteInternal: ZenDB<T, any>["deleteInternal"];
  updateInternal: ZenDB<T, any>["updateInternal"];
  getAllTraverser: ZenDB<T, any>["getAllTraverser"];
  indexSelect: ZenDBIndexes<T, any>["select"];
};

export type IndexSelectData<V> = {
  direction?: Direction;
  offset?: { kind: "count"; count: number } | { kind: "addr"; addr: PageAddr };
  filter?: Filter<V>;
};

export type TraverserResult<T> = {
  addr: RawPageAddr;
  data?: Wrapped<T> | null;
} | null;

export type Traverser<T> = () => TraverserResult<T>;

export type GetTraverser<T> = () => Traverser<T>;

export type Direction = "Asc" | "Desc";

export const QUERY_BUILDER_INTERNAL = Symbol("QUERY_BUILDER_INTERNAL");

export type Wrapped<T> = { inner: T };

export function wrap<T>(val: T): Wrapped<T> {
  return { inner: val };
}

export function arrayToGetGetTraverser<T>(
  arr: Array<RawPageAddr>
): GetTraverser<T> {
  return () => {
    let index = 0;
    return () => {
      if (index < arr.length) {
        index += 1;
        return { addr: arr[index] };
      }
      return null;
    };
  };
}
