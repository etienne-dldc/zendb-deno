import { Comparable, compareOrder } from "../tools/Comparable.ts";
import { RawPageAddr } from "../PageAddr.ts";
import { IndexInternalPage } from "../pages/IndexInternalPage.ts";
import {
  IndexLeafData,
  IndexLeafDataTuple,
  IndexLeafPage,
} from "../pages/IndexLeafPage.ts";
import { IndexTreePage } from "../pages/utils.ts";
import { TreeParentRef } from "./types.d.ts";

export type TreeInsertResult = null | {
  type: "splitted";
  orphanPage: IndexTreePage;
  orphanFirstKey: Comparable;
};

export function treeInsert(
  parent: TreeParentRef,
  page: IndexTreePage,
  key: Comparable,
  value: RawPageAddr
): TreeInsertResult {
  if (page instanceof IndexLeafPage) {
    return insertInIndexLeafPage(parent, page, key, value);
  }
  return insertInIndexInternalPage(parent, page, key, value);
}

function insertInIndexLeafPage(
  parent: TreeParentRef,
  page: IndexLeafPage,
  key: Comparable,
  addr: RawPageAddr
): TreeInsertResult {
  const data = page.data;
  const existsIndex = data.findIndex(([k]) => compareOrder(k, "equal", key));
  if (existsIndex >= 0) {
    // add to existing leaf item
    const exists = data[existsIndex];
    if (page.unique) {
      throw new Error(`Unique error`);
    }
    const dataCopy = data.slice();
    const currentList = exists[1] as Array<number>;
    if (currentList.includes(addr)) {
      throw new Error(`Addr already in index ?`);
    }
    dataCopy[existsIndex] = [exists[0], insertInAddrList(currentList, addr)];
    page.data = dataCopy;
    // nothing more to do
    return null;
  }
  // insert
  const insertItem: IndexLeafDataTuple = [key, page.unique ? addr : [addr]];
  const newItems = insertInLeafData(data, insertItem);
  if (newItems.length <= page.maxKeys) {
    // no overflow
    page.data = newItems;
    return null;
  }
  // need to split
  const midIndex = Math.floor(newItems.length / 2);
  const leftItems = newItems.slice(0, midIndex);
  const rightItems = newItems.slice(midIndex);
  const orphanPage = new IndexLeafPage(
    parent.createPage(),
    page.order,
    page.unique
  );
  const nextSibling = parent.getIndexLeafPage(
    page.nextSibling,
    page.order,
    page.unique
  );
  orphanPage.data = rightItems;
  page.data = leftItems;
  orphanPage.prevSibling = page.addr;
  orphanPage.nextSibling = page.nextSibling;
  page.nextSibling = orphanPage.addr;
  nextSibling.prevSibling = orphanPage.addr;
  return {
    type: "splitted",
    orphanPage,
    orphanFirstKey: rightItems[0][0],
  };
}

function insertInIndexInternalPage(
  parent: TreeParentRef,
  page: IndexInternalPage,
  key: Comparable,
  addr: RawPageAddr
): TreeInsertResult {
  const sub = page.findChild(key);
  const subTree = parent.getIndexPage(sub.addr, page.order);
  const res = treeInsert(parent, subTree, key, addr);
  if (res === null) {
    return null;
  }
  if (res.type === "splitted") {
    const [headChild, items] = page.data;
    const newtItems = items.slice();
    newtItems.splice(sub.index + 1, 0, [
      res.orphanFirstKey,
      res.orphanPage.addr,
    ]);
    res.orphanPage.parent = page.addr;
    if (newtItems.length <= page.maxKeys) {
      // no overflow
      page.data = [headChild, newtItems];
      return null;
    }
    // split
    const midIndex = Math.floor(newtItems.length / 2); // offset by -1 for headChild
    const leftItems = newtItems.slice(0, midIndex);
    const midItem = newtItems[midIndex];
    const rightItems = newtItems.slice(midIndex + 1);
    const orphanPage = new IndexInternalPage(parent.createPage(), page.order);
    orphanPage.data = [midItem[1], rightItems];
    page.data = [headChild, leftItems];
    return {
      type: "splitted",
      orphanPage: orphanPage,
      orphanFirstKey: midItem[0],
    };
  }
  throw new Error("Unexpected");
}

function insertInAddrList(
  list: Array<RawPageAddr>,
  addr: RawPageAddr
): Array<RawPageAddr> {
  const copy: Array<number> = [];
  let inserted = false;
  for (const a of list) {
    if (!inserted) {
      const diff = a - addr;
      if (diff > 0) {
        inserted = true;
        copy.push(addr);
      }
    }
    copy.push(a);
  }
  if (!inserted) {
    copy.push(addr);
  }
  return copy;
}

function insertInLeafData(
  data: IndexLeafData,
  newItem: IndexLeafDataTuple
): IndexLeafData {
  const [newKey] = newItem;
  if (data.length === 0) {
    return [newItem];
  }
  const firstKey = data[0][0];
  if (compareOrder(newKey, "isBefore", firstKey)) {
    return [newItem, ...data];
  }
  const updatedData: IndexLeafData = [];
  let inserted = false;
  for (const item of data) {
    if (!inserted) {
      if (compareOrder(newKey, "isBefore", item[0])) {
        inserted = true;
        updatedData.push(newItem);
      }
    }
    updatedData.push(item);
  }
  if (!inserted) {
    updatedData.push(newItem);
  }
  return updatedData;
}
