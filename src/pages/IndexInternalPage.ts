import { FixedBlockList, Block, Page, BlockSeq } from "../../deps.ts";
import { Comparable, compareOrder } from "./../compare.ts";
import { PageAddr, PageType, ADDR_BLOCK, KEY_BLOCK } from "./utils.ts";

export type IndexInternalDataTuple = readonly [
  key: Comparable,
  child: PageAddr
];

export type IndexInternalData = [
  headChild: PageAddr,
  items: ReadonlyArray<IndexInternalDataTuple>
];

const INDEX_INTERNAL_HEADER = [
  FixedBlockList.named("parent", Block.uint16),
  FixedBlockList.named("keysCount", Block.uint16),
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
    if (page.type === PageType.Empty) {
      page.type = PageType.IndexInternal;
      // TODO: Init ?
    }
    if (page.type !== PageType.IndexInternal) {
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

  public get min(): number {
    return this.isRoot ? 2 : Math.ceil(this.order / 2);
  }

  public get maxKeys(): number {
    return this.order - 1;
  }

  public get max(): number {
    return this.order;
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
  public findChild(val: Comparable): { addr: PageAddr; index: number } {
    const [headChild, items] = this.data;
    const firstKey = items[0][0];
    if (compareOrder(val, "isBefore", firstKey)) {
      return { addr: headChild, index: -1 };
    }
    for (let index = 0; index < items.length; index++) {
      const [key, child] = items[index];
      if (compareOrder(key, "isAfterOrEqual", val)) {
        return { addr: child, index };
      }
    }
    const index = items.length - 1;
    return { index, addr: items[index][1] };
  }
}
