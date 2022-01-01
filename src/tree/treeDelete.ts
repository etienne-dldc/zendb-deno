import { Comparable, compareOrder } from "../tools/Comparable.ts";
import { RawPageAddr } from "../PageAddr.ts";
import { IndexInternalPage } from "../pages/IndexInternalPage.ts";
import { IndexLeafPage } from "../pages/IndexLeafPage.ts";
import { IndexTreePage } from "../pages/utils.ts";
import { TreeParentRef } from "./types.d.ts";

export type TreeDeleteResult = null | {
  type: "removed";
  deletedNextKey: Comparable;
};

export function treeDelete(
  parent: TreeParentRef,
  page: IndexTreePage,
  key: Comparable,
  value: RawPageAddr
): TreeDeleteResult {
  if (page instanceof IndexLeafPage) {
    return deleteInIndexLeafPage(page, key, value);
  }
  return deleteInIndexInternalPage(parent, page, key, value);
}

function deleteInIndexLeafPage(
  page: IndexLeafPage,
  key: Comparable,
  value: RawPageAddr
): TreeDeleteResult {
  const data = page.data;
  const existsIndex = data.findIndex(([k]) => compareOrder(k, "equal", key));
  if (existsIndex < 0) {
    // not in tree do nothing
    return null;
  }
  const exists = data[existsIndex];
  if (page.unique === false) {
    // if page is not unique then we remove the value from the list
    // only if the resulting list is empty we remove the key
    const list = exists[1] as Array<RawPageAddr>;
    if (list.includes(value) === false) {
      // nothing to delete
      return null;
    }
    if (list.length > 1) {
      // remove value from list
      const nextList = list.filter((v) => v !== value);
      const nextData = data.slice();
      // replace entry
      nextData.splice(existsIndex, 1, [exists[0], nextList]);
      page.data = nextData;
      return null;
    }
    // list will be empty, need to remove the entry from the tree
  }
  const nextData = data.slice();
  // delete key
  nextData.splice(existsIndex, 1);
  page.data = nextData;

  if (existsIndex === 0) {
    // parent need to replace key with deletedNextKey
    return { type: "removed", deletedNextKey: nextData[0][0] };
  }
  // done
  return null;
}

function deleteInIndexInternalPage(
  parent: TreeParentRef,
  page: IndexInternalPage,
  key: Comparable,
  value: RawPageAddr
): TreeDeleteResult {
  // find child
  const sub = page.findChild(key);
  const subTree = parent.getIndexPage(sub.addr, page.order);
  const res = treeDelete(parent, subTree, key, value);
  if (res === null) {
    return null;
  }
  if (res.type === "removed") {
    if (compareOrder(sub.key, "equal", key)) {
      // replace key
      page.setKeyAtIndex(sub.index, res.deletedNextKey);
    }
    return res;
  }
  throw new Error(`Unexpected`);
}
