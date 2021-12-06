// deno-lint-ignore-file no-explicit-any
import { Page } from "../../deps.ts";
import { StoragePageType, VALUE_BLOCK } from "./utils.ts";

export class DataItemPage {
  private readonly page: Page;
  private dataCache: null | any = null;

  constructor(page: Page) {
    if (page.type === StoragePageType.Empty) {
      // init page
      page.type = StoragePageType.DataItem;
    }
    if (page.type !== StoragePageType.DataItem) {
      throw new Error("Invalid page type");
    }
    this.page = page;
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

  public get data(): any {
    if (this.closed) {
      throw new Error("Page closed");
    }
    if (this.dataCache) {
      return this.dataCache;
    }
    const val = VALUE_BLOCK.read.read(this.page, 0);
    this.dataCache = val;
    return val;
  }

  public set data(data: any) {
    this.dataCache = data;
    VALUE_BLOCK.write.write(this.page, 0, data);
  }

  public delete() {
    this.page.delete();
  }
}
