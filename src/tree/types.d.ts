// deno-lint-ignore-file no-explicit-any
import { ZenDBIndexes } from "../ZenDBIndexes.ts";

export type TreeParentRef = {
  getIndexLeafPage: ZenDBIndexes<any, any>["getIndexLeafPage"];
  getIndexInternalPage: ZenDBIndexes<any, any>["getIndexInternalPage"];
  deletePage: ZenDBIndexes<any, any>["file"]["deletePage"];
  createPage: ZenDBIndexes<any, any>["file"]["createPage"];
  getIndexPage: ZenDBIndexes<any, any>["getIndexPage"];
};
