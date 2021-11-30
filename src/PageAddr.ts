const PAGE_ADDR_INTERNAL = Symbol("PAGE_ADDR_INTERNAL");

export type RawPageAddr = number;

export class PageAddr {
  public readonly addr: number;

  // prevent user from passing { addr: number }
  public readonly [PAGE_ADDR_INTERNAL] = true;

  constructor(addr: number) {
    this.addr = addr;
  }
}
