import { FixedBlockList, Block, Page, BlockSeq } from "../../deps.ts";
import { Comparable, compareOrder } from "../Comparable.ts";
import { RawPageAddr } from "../PageAddr.ts";
import { IndexesPageType, ADDR_BLOCK, KEY_BLOCK } from "./utils.ts";

export type IndexInternalDataTuple = readonly [
  key: Comparable,
  child: RawPageAddr
];

export type IndexInternalData = [
  headChild: RawPageAddr,
  items: ReadonlyArray<IndexInternalDataTuple>
];

const INDEX_INTERNAL_HEADER = [
  FixedBlockList.named("parent", Block.uint32),
  FixedBlockList.named("keysCount", Block.uint32),
] as const;

export class IndexInternalPage {
  private readonly page: Page;
  private readonly blocks: FixedBlockList<typeof INDEX_INTERNAL_HEADER>;
  private dataCache: null | IndexInternalData = null;

  public readonly order: number;

  constructor(page: Page, order: number) {
    this.page = page;
    this.order = order;
    this.blocks = new FixedBlockList(INDEX_INTERNAL_HEADER, page);
    if (page.type === IndexesPageType.Empty) {
      page.type = IndexesPageType.IndexTreeInternal;
      // TODO: Init ?
    }
    if (page.type !== IndexesPageType.IndexTreeInternal) {
      throw new Error(`Page type mismatch`);
    }
  }

  public get isRoot(): boolean {
    return this.blocks.read("parent") === 0;
  }

  public get type() {
    return this.page.type;
  }

  public get addr() {
    return this.page.addr;
  }

  // public get min(): number {
  //   return this.isRoot ? 2 : Math.ceil(this.order / 2);
  // }

  // public get max(): number {
  //   return this.order;
  // }

  public get minKeys(): number {
    return this.isRoot ? 1 : Math.ceil(this.order / 2) - 1;
  }

  public get maxKeys(): number {
    return this.order - 1;
  }

  public get closed() {
    return this.page.closed;
  }

  public get keysCount() {
    return this.blocks.read("keysCount");
  }

  public get parent() {
    return this.blocks.read("parent");
  }

  public set parent(addr: number) {
    this.blocks.write("parent", addr);
  }

  public get data(): IndexInternalData {
    if (this.dataCache) {
      return this.dataCache;
    }
    const seq = new BlockSeq(this.blocks.selectRest());
    const first = seq.read(ADDR_BLOCK.read);
    const items: Array<readonly [key: Comparable, children: number]> = [];
    for (let i = 0; i < this.keysCount; i++) {
      const key = seq.read(KEY_BLOCK.read);
      const children = seq.read(ADDR_BLOCK.read);
      items.push([key, children]);
    }
    const result: IndexInternalData = [first, items];
    this.dataCache = result;
    return result;
  }

  public set data(data: IndexInternalData) {
    this.dataCache = data;
    const [first, items] = data;
    this.blocks.write("keysCount", items.length);
    const seq = new BlockSeq(this.blocks.selectRest());
    seq.write(ADDR_BLOCK.write, first);
    for (const [key, children] of items) {
      seq.write(KEY_BLOCK.write, key);
      seq.write(ADDR_BLOCK.write, children);
    }
  }

  // return index and addr of child for key
  // returns index: -1 for headChild
  public findChild(val: Comparable): {
    addr: RawPageAddr;
    index: number;
    key: Comparable | null;
  } {
    const [headChild, items] = this.data;
    const firstKey = items[0][0];
    if (compareOrder(val, "isBefore", firstKey)) {
      return { addr: headChild, index: -1, key: null };
    }
    for (let index = 0; index < items.length; index++) {
      const [key, child] = items[index];
      if (compareOrder(key, "isAfterOrEqual", val)) {
        return { addr: child, index, key };
      }
    }
    const index = items.length - 1;
    return { index, addr: items[index][1], key: items[index][0] };
  }

  public getLeftChildAddr(index: number): RawPageAddr | null {
    if (index === -1) {
      return null;
    }
    const [headChild, items] = this.data;
    if (index === 0) {
      return headChild;
    }
    const item = items[index - 1];
    if (!item) {
      return null;
    }
    return item[1];
  }

  public getRightChildAddr(index: number): RawPageAddr | null {
    const [_headChild, items] = this.data;
    // this works because headchild is -1 which will return item at index 0
    const item = items[index + 1];
    if (!item) {
      return null;
    }
    return item[1];
  }

  public setKeyAtIndex(index: number, key: Comparable) {
    const [headChild, items] = this.data;
    if (index < 0 || index >= items.length) {
      return;
    }
    const nextItems = items.slice();
    nextItems[index] = [key, nextItems[index][1]];
    this.data = [headChild, nextItems];
  }
}
