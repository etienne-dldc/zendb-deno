import {
  FixedBlockList,
  Block,
  Page,
  BlockSeq,
  IBufferFacade,
} from "../../deps.ts";
import { Comparable } from "../Comparable.ts";
import { RawPageAddr } from "../PageAddr.ts";
import {
  KEY_BLOCK,
  ADDR_BLOCK,
  ADDR_LIST_BLOCK,
  IndexesPageType,
} from "./utils.ts";

const INDEX_LEAF_HEADER = [
  FixedBlockList.named("parent", Block.uint32), // if 0 then is tree root
  FixedBlockList.named("prevSibling", Block.uint32),
  FixedBlockList.named("nextSibling", Block.uint32),
  FixedBlockList.named("count", Block.uint16),
] as const;

export type IndexLeafDataTuple = readonly [
  Comparable,
  RawPageAddr | Array<RawPageAddr>
];

export type IndexLeafData = Array<IndexLeafDataTuple>;

export class IndexLeafPage {
  private readonly page: Page;
  private readonly blocks: FixedBlockList<typeof INDEX_LEAF_HEADER>;
  private readonly content: IBufferFacade;
  private dataCache: IndexLeafData | null = null;

  public readonly order: number;
  public readonly unique: boolean;

  constructor(page: Page, order: number, unique: boolean) {
    this.order = order;
    const type = unique
      ? IndexesPageType.IndexTreeUniqueLeaf
      : IndexesPageType.IndexTreeLeaf;
    if (page.type === IndexesPageType.Empty) {
      // init page
      page.type = type;
    }
    if (page.type !== type) {
      throw new Error("Invalid page type");
    }
    this.page = page;
    this.unique = unique;
    this.blocks = new FixedBlockList(INDEX_LEAF_HEADER, page);
    this.content = this.blocks.selectRest();
  }

  public get minKeys(): number {
    return this.isRoot ? 0 : Math.ceil(this.order / 2);
  }

  public get maxKeys(): number {
    return this.order - 1;
  }

  public get isRoot(): boolean {
    return this.blocks.read("parent") === 0;
  }

  public get type() {
    return this.page.type;
  }

  public get closed() {
    return this.page.closed;
  }

  public get addr() {
    return this.page.addr;
  }

  public get count() {
    return this.blocks.read("count");
  }

  public get parent() {
    return this.blocks.read("parent");
  }

  public set parent(addr: number) {
    this.blocks.write("parent", addr);
  }

  public get prevSibling() {
    return this.blocks.read("prevSibling");
  }

  public set prevSibling(addr: number) {
    this.blocks.write("prevSibling", addr);
  }

  public get nextSibling() {
    return this.blocks.read("nextSibling");
  }

  public set nextSibling(addr: number) {
    this.blocks.write("nextSibling", addr);
  }

  public get data(): IndexLeafData {
    if (this.closed) {
      throw new Error("Page closed");
    }
    if (this.dataCache) {
      return this.dataCache;
    }
    const results: Array<IndexLeafDataTuple> = [];
    const seq = new BlockSeq(this.content);
    for (let i = 0; i < this.count; i++) {
      const key = seq.read(KEY_BLOCK.read);
      const value = this.unique
        ? seq.read(ADDR_BLOCK.read)
        : seq.read(ADDR_LIST_BLOCK.read);
      results.push([key, value]);
    }
    this.dataCache = results;
    return results;
  }

  public set data(data: IndexLeafData) {
    this.dataCache = data;
    this.blocks.write("count", data.length);
    const seq = new BlockSeq(this.content);
    for (const [key, value] of data) {
      seq.write(KEY_BLOCK.write, key);
      if (this.unique) {
        seq.write(ADDR_BLOCK.write, value as RawPageAddr);
      } else {
        seq.write(ADDR_LIST_BLOCK.write, value as Array<RawPageAddr>);
      }
    }
  }
}
