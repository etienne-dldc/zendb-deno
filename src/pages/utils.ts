import { Block, BinvalBlock } from "../../deps.ts";
import { DataItemPage } from "./DataItemPage.ts";
import { DataListPage } from "./DataListPage.ts";
import { IndexesRootPage } from "./IndexesRootPage.ts";
import { IndexInternalPage } from "./IndexInternalPage.ts";
import { IndexLeafPage } from "./IndexLeafPage.ts";
import { StorageRootPage } from "./StorageRootPage.ts";

export const KEY_BLOCK = BinvalBlock.value;
export const VALUE_BLOCK = BinvalBlock.value;
export const ADDR_BLOCK = Block.uint32;
export const ADDR_LIST_BLOCK = Block.arrayOf(ADDR_BLOCK);
export const ZENDB_TEXT_STORAGE_HEADER = "ZenDB storage";
export const ZENDB_TEXT_INDEXES_HEADER = "ZenDB indexes";
export const ZENDB_VERSION = 1;

export enum StoragePageType {
  // when page are created the default type is Empty we use this to detect the need to scaffold
  Empty = 0,
  DataItem,
  DataList,
}

export enum IndexesPageType {
  // when page are created the default type is Empty we use this to detect the need to scaffold
  Empty = 0,
  IndexTreeInternal,
  IndexTreeUniqueLeaf,
  IndexTreeLeaf,
}

export type IndexTreePage = IndexLeafPage | IndexInternalPage;
export type IndexesPageAny = IndexTreePage | IndexesRootPage;
export type StoragePageAny = StorageRootPage | DataItemPage | DataListPage;

export function last<T>(arr: Array<T>): T | null {
  return arr[arr.length - 1] ?? null;
}
