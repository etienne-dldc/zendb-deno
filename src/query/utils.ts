// deno-lint-ignore-file no-explicit-any
import { RawPageAddr } from "../PageAddr.ts";
import { ZenDB } from "../ZenDB.ts";

export type QueryBuilderParentRef<T> = {
  insertInternal: ZenDB<T, any>["insertInternal"];
  getData: ZenDB<T, any>["getData"];
  deleteInternal: ZenDB<T, any>["deleteInternal"];
  updateInternal: ZenDB<T, any>["updateInternal"];
};

export type NextResult<T> = {
  addr: RawPageAddr;
  data?: Wrapped<T> | null;
} | null;

export type Next<T> = () => NextResult<T>;

export type GetNext<T> = () => Next<T>;

export type Direction = "Asc" | "Desc";

export const QUERY_BUILDER_INTERNAL = Symbol("QUERY_BUILDER_INTERNAL");

export type Wrapped<T> = { inner: T };

export function wrap<T>(val: T): Wrapped<T> {
  return { inner: val };
}

export function arrayToGetNext<T>(arr: Array<RawPageAddr>): GetNext<T> {
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
