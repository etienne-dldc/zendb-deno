// deno-lint-ignore-file no-explicit-any
import { IndexInternalPage } from "../pages/IndexInternalPage.ts";
import { IndexLeafPage } from "../pages/IndexLeafPage.ts";
import { IndexTreePage } from "../pages/utils.ts";
import { Direction, Traverser, IndexSelectDataOffset } from "../query/utils.ts";
import { Comparable, compareOrder } from "../tools/Comparable.ts";
import { TreeParentRef } from "./types.d.ts";

export type TreeTraverseOffset =
  | { kind: "count"; count: number }
  | { kind: "addr"; offsetKey: Comparable; offsetAddr: number };

export function treeTraverse(
  parent: TreeParentRef,
  page: IndexTreePage,
  key: Comparable,
  direction: Direction,
  offset: TreeTraverseOffset | null
): Traverser<any> {
  if (page instanceof IndexLeafPage) {
    return traverseIndexLeafPage(parent, page, key, direction, offset);
  }
  return traverseIndexInternalPage(parent, page, key, direction, offset);
}

function traverseIndexLeafPage(
  parent: TreeParentRef,
  page: IndexLeafPage,
  key: Comparable,
  direction: Direction,
  offset: TreeTraverseOffset | null
): Traverser<any> {
  // found the page, need to find the index of key
  const index = page.data.findIndex(([k]) => compareOrder(k, "equal", key));
  if (index >= 0) {
    // found exact match
    if (offset !== null) {
      // find offset
      const [_key, addrs] = page.data[index];
      if (typeof addrs === "number") {
        // single addr (unique index)
        if (addrs !== offset) {
          throw new Error("Found key but it did not match offset");
        }
        return { page, keyIndex: index, foundExact: true, addrIndex: null };
      }
      // multiple addrs
      const addrIndex = addrs.indexOf(offset);
      if (addrIndex < 0) {
        throw new Error("Found key but could not find offset");
      }
      return { page, keyIndex: index, foundExact: true, addrIndex };
    }
    return { page, keyIndex: index, foundExact: true, addrIndex: null };
  }
  // not found exact match, need to find the closest key depending on direction

  throw new Error("not implemented");
}

function traverseIndexInternalPage(
  parent: TreeParentRef,
  page: IndexInternalPage,
  key: Comparable,
  direction: Direction,
  offset: TreeTraverseOffset | null
): Traverser<any> {
  const sub = page.findChild(key);
  const subTree = parent.getIndexPage(sub.addr, page.order);
  return treeTraverse(parent, subTree, key, direction, offset);
}
