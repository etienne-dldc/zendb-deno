import { Block, BinvalBlock } from "../../deps.ts";
import { DataItemPage } from "./DataItemPage.ts";
import { DataListPage } from "./DataListPage.ts";
import { IndexInternalPage } from "./IndexInternalPage.ts";
import { IndexLeafPage } from "./IndexLeafPage.ts";
import { RootPage } from "./RootPage.ts";

export const KEY_BLOCK = BinvalBlock.value;
export const VALUE_BLOCK = BinvalBlock.value;
export const ADDR_BLOCK = Block.uint16;
export const ADDR_LIST_BLOCK = Block.arrayOf(Block.uint16);
export const ZENDB_TEXT_HEADER = "ZenDB format";
export const ZENDB_VERSION = 1;

export type PageAddr = number;

export enum PageType {
  // when page are created the default type is Empty we use this to detect the need to scaffold
  Empty = 0,
  DataItem,
  DataList,
  IndexInternal,
  IndexUniqueLeaf,
  IndexLeaf,
}

export type IndexPage = IndexLeafPage | IndexInternalPage;

export type PageAny = RootPage | DataItemPage | DataListPage | IndexPage;

export function last<T>(arr: Array<T>): T | null {
  return arr[arr.length - 1] ?? null;
}
