import {
  FixedBlockList,
  Block,
  Page,
  BinvalWriteBlock,
  BinvalReadBlock,
} from "../../deps.ts";
import { RawPageAddr } from "../PageAddr.ts";
import { ZENDB_TEXT_INDEXES_HEADER } from "./utils.ts";
import { ZENDB_VERSION } from "./utils.ts";

export type RootDataIndex = {
  // Index tree (root IndexInternalPage)
  addr: RawPageAddr;
  order: number;
  unique: boolean;
};

type IndexesRootData = Record<string, RootDataIndex>;

const INDEXES_ROOT_HEADER = [
  FixedBlockList.named(
    "textHeader",
    Block.staticString(ZENDB_TEXT_INDEXES_HEADER)
  ),
  FixedBlockList.named("version", Block.uint8),
] as const;

export class IndexesRootPage {
  private readonly page: Page;
  private readonly blocks: FixedBlockList<typeof INDEXES_ROOT_HEADER>;

  constructor(page: Page, fileIsEmpty: boolean) {
    if (page.isRoot === false) {
      throw new Error(`Root page should receive root page !`);
    }
    this.page = page;
    this.blocks = new FixedBlockList(INDEXES_ROOT_HEADER, page);
    if (fileIsEmpty) {
      this.blocks.write("textHeader", null);
      this.blocks.write("version", ZENDB_VERSION);
    }
    if (this.blocks.read("textHeader") !== ZENDB_TEXT_INDEXES_HEADER) {
      throw new Error(`Invalid file: ZenDB text header did not match`);
    }
    if (this.blocks.read("version") !== ZENDB_VERSION) {
      throw new Error(`Invalid ZenDB format version`);
    }
  }

  public get closed() {
    return this.page.closed;
  }

  public set data(data: IndexesRootData) {
    BinvalWriteBlock.value.write(this.blocks.selectRest(), 0, data);
  }

  public get data(): IndexesRootData {
    return BinvalReadBlock.value.read(this.blocks.selectRest(), 0);
  }
}