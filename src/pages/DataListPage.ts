import { FixedBlockList, Block, Page, IBufferFacade } from "../../deps.ts";
import { RawPageAddr } from "../PageAddr.ts";
import { ADDR_BLOCK, StoragePageType } from "./utils.ts";

const DATA_LIST_HEADER = [
  FixedBlockList.named("itemsCount", Block.uint32),
] as const;

export class DataListPage {
  private readonly page: Page;
  private readonly blocks: FixedBlockList<typeof DATA_LIST_HEADER>;
  private readonly content: IBufferFacade;

  constructor(page: Page) {
    this.page = page;
    this.blocks = new FixedBlockList(DATA_LIST_HEADER, page);
    this.content = this.blocks.selectRest();
    if (page.type === StoragePageType.Empty) {
      // init page
      page.type = StoragePageType.DataList;
      this.blocks.write("itemsCount", 0);
    }
    if (page.type !== StoragePageType.DataList) {
      throw new Error("Invalid page type");
    }
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

  public add(newAddr: number): void {
    const readMaxCount = Math.floor(
      this.content.byteLength / ADDR_BLOCK.read.size
    );
    let firstEmptyAddress = readMaxCount;
    for (let i = 0; i < readMaxCount; i++) {
      const addr = ADDR_BLOCK.read.read(this.content, i * ADDR_BLOCK.read.size);
      if (addr === 0 && i < firstEmptyAddress) {
        firstEmptyAddress = i;
      }
      if (addr === newAddr) {
        throw new Error(`Adress already exists`);
      }
    }
    ADDR_BLOCK.write.write(
      this.content,
      firstEmptyAddress * ADDR_BLOCK.read.size,
      newAddr
    );
    this.blocks.write("itemsCount", this.blocks.read("itemsCount") + 1);
  }

  public remove(removeAddr: RawPageAddr): void {
    const readMaxCount = Math.floor(
      this.content.byteLength / ADDR_BLOCK.read.size
    );
    for (let i = 0; i < readMaxCount; i++) {
      const addr = ADDR_BLOCK.read.read(this.content, i * ADDR_BLOCK.read.size);
      if (addr === removeAddr) {
        ADDR_BLOCK.write.write(this.content, i * ADDR_BLOCK.read.size, 0);
        break;
      }
    }
    this.blocks.write("itemsCount", this.blocks.read("itemsCount") - 1);
  }

  public getAll(): Array<RawPageAddr> {
    const readMaxCount = Math.floor(
      this.content.byteLength / ADDR_BLOCK.read.size
    );
    const result: Array<RawPageAddr> = [];
    for (let i = 0; i < readMaxCount; i++) {
      const addr = ADDR_BLOCK.read.read(this.content, i * ADDR_BLOCK.read.size);
      if (addr !== 0) {
        result.push(addr);
      }
    }
    return result;
  }

  public forEach(onAddr: (addr: RawPageAddr) => void): void {
    const readMaxCount = Math.floor(
      this.content.byteLength / ADDR_BLOCK.read.size
    );
    for (let i = 0; i < readMaxCount; i++) {
      const addr = ADDR_BLOCK.read.read(this.content, i * ADDR_BLOCK.read.size);
      if (addr !== 0) {
        onAddr(addr);
      }
    }
  }
}
