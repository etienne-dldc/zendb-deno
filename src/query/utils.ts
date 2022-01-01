// deno-lint-ignore-file no-explicit-any
import { Comparable } from "../tools/Comparable.ts";
import { Filter } from "../tools/Filters.ts";
import { PageAddr, RawPageAddr } from "../PageAddr.ts";
import {
  complementRanges,
  intersectRanges,
  range,
  Ranges,
  unionRanges,
} from "../tools/Range.ts";
import { ZenDB } from "../ZenDB.ts";
import { ZenDBIndexes } from "../ZenDBIndexes.ts";
import { QueryBuilderIndex } from "./QueryBuilderIndex.ts";

export type QueryBuilderParentRef<T> = {
  insertInternal: ZenDB<T, any>["insertInternal"];
  getData: ZenDB<T, any>["getData"];
  deleteInternal: ZenDB<T, any>["deleteInternal"];
  updateInternal: ZenDB<T, any>["updateInternal"];
  getAllTraverser: ZenDB<T, any>["getAllTraverser"];
  indexSelect: ZenDBIndexes<T, any>["select"];
};

export function resolveIndexSelectData<V extends Comparable>(
  config: IndexSelectData<V> | IndexBuiderFn<V>
): IndexSelectData<V> {
  const configResolved =
    typeof config === "function"
      ? config(new QueryBuilderIndex({}))[QUERY_BUILDER_INTERNAL]
      : config;
  return configResolved;
}

export type IndexBuiderFn<V extends Comparable> = (
  builder: QueryBuilderIndex<V>
) => QueryBuilderIndex<V>;

export type IndexSelectDataOffset =
  | { kind: "count"; count: number }
  | { kind: "addr"; addr: PageAddr };

export type IndexSelectData<V extends Comparable> = {
  direction?: Direction;
  offset?: IndexSelectDataOffset;
  filter?: Filter<V>;
};

export type TraverserResult<T> = {
  addr: RawPageAddr;
  data?: Wrapped<T> | null;
} | null;

export type Traverser<T> = () => TraverserResult<T>;

export type GetTraverser<T> = () => Traverser<T>;

export type Direction = "Asc" | "Desc";

export function emptyGetTraverser<T>(): GetTraverser<T> {
  return () => () => null;
}

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

export function filterToRanges<V extends Comparable>(
  filter: Filter<V>
): Ranges<V> {
  if (filter.kind === "and") {
    return intersectRanges(
      filterToRanges(filter.left),
      filterToRanges(filter.right)
    );
  }
  if (filter.kind === "or") {
    return unionRanges(
      filterToRanges(filter.left),
      filterToRanges(filter.right)
    );
  }
  if (filter.kind === "not") {
    return complementRanges(filterToRanges(filter.filter));
  }
  if (filter.kind === "oneOf") {
    return filter.values.map((value) => range(value, value));
  }
  if (filter.kind === "between") {
    return [range(filter.min, filter.max, filter.options)];
  }
  if (filter.kind === "equal") {
    return [range(filter.value, filter.value)];
  }
  expectNever(filter);
}

function expectNever(val: never): never {
  throw new Error(`Expected never: ${val}`);
}
