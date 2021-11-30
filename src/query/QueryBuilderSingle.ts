// deno-lint-ignore-file no-explicit-any
import { PageAddr, RawPageAddr } from "../PageAddr.ts";
import {
  QUERY_BUILDER_INTERNAL,
  wrap,
  Wrapped,
  QueryBuilderParentRef,
} from "./utils.ts";

export class QueryBuilderSingleReadonly<T, Maybe extends boolean> {
  [QUERY_BUILDER_INTERNAL] = undefined;

  protected parent: QueryBuilderParentRef<any>;
  protected addr: RawPageAddr | null;
  protected data: null | Wrapped<T>; // data is inside an object because it could be null or undefined and stiff be present

  constructor(
    parent: QueryBuilderParentRef<any>,
    addr: RawPageAddr | null,
    data: null | Wrapped<T>
  ) {
    this.data = data;
    this.addr = addr;
    this.parent = parent;
  }

  transform<Out>(
    transform: (item: T) => Out
  ): QueryBuilderSingleReadonly<Out, Maybe> {
    if (this.addr === null) {
      return new QueryBuilderSingleReadonly<Out, Maybe>(
        this.parent,
        null,
        null
      );
    }
    const data = this.resolveData(this.addr);
    const nextData = wrap(transform(data.inner));
    return new QueryBuilderSingleReadonly<Out, Maybe>(
      this.parent,
      this.addr,
      nextData
    );
  }

  /**
   * Here filter is actually dynamicFilter but since since we have 1 object
   * Index lookup is probably slower so we don't offer it
   */
  filter(filter: (val: T) => boolean): QueryBuilderSingle<T, true> {
    if (this.addr === null) {
      return new QueryBuilderSingle<T, true>(this.parent, null, null);
    }
    const data = this.resolveData(this.addr);
    const keep = filter(data.inner);
    if (keep) {
      return new QueryBuilderSingle<T, true>(this.parent, this.addr, data);
    }
    return new QueryBuilderSingle<T, true>(this.parent, null, null);
  }

  value(): Maybe extends true ? T | null : T {
    if (this.addr === null) {
      return null as any;
    }
    const data = this.resolveData(this.addr);
    return data.inner;
  }

  key(): Maybe extends true ? PageAddr | null : PageAddr {
    if (this.addr === null) {
      return null as any;
    }
    return new PageAddr(this.addr);
  }

  entry(): Maybe extends true ? [PageAddr, T] | null : [PageAddr, T] {
    if (this.addr === null) {
      return null as any;
    }
    const data = this.resolveData(this.addr);
    return [new PageAddr(this.addr), data.inner];
  }

  protected resolveData(addr: number): Wrapped<T> {
    return this.data ?? wrap(this.parent.getData(addr));
  }
}

export class QueryBuilderSingle<
  T,
  Maybe extends boolean
> extends QueryBuilderSingleReadonly<T, Maybe> {
  constructor(
    parent: QueryBuilderParentRef<any>,
    addr: RawPageAddr | null,
    data: null | Wrapped<T> = null
  ) {
    super(parent, addr, data);
  }

  /**
   * We could technically allow transform().delete()
   * but we don't want delete().update() to be possible
   * This is probably fine because you can delete().transform() which produce the same result
   */
  delete(): QueryBuilderSingleReadonly<T, Maybe> {
    if (this.addr === null) {
      return new QueryBuilderSingleReadonly<T, Maybe>(this.parent, null, null);
    }
    // getData before delete so .value() works
    const data = this.resolveData(this.addr);
    this.parent.deleteInternal(this.addr);
    return new QueryBuilderSingleReadonly<T, Maybe>(
      this.parent,
      this.addr,
      data
    );
  }

  update(update: T | ((item: T) => T)): QueryBuilderSingle<T, Maybe> {
    if (this.addr === null) {
      return new QueryBuilderSingle(this.parent, null, null);
    }
    const data = this.resolveData(this.addr);
    const updateResolved =
      typeof update === "function" ? (update as any)(data) : update;
    this.parent.updateInternal(this.addr, updateResolved);
    return new QueryBuilderSingle(this.parent, this.addr, data);
  }

  upsert(data: T | ((item: T | null) => T)): QueryBuilderSingle<T, false> {
    if (this.addr === null) {
      const obj = typeof data === "function" ? (data as any)(null) : data;
      const addr = this.parent.insertInternal(obj);
      return new QueryBuilderSingle<T, false>(this.parent, addr, wrap(obj));
    }
    // just update
    return this.update(data) as any;
  }
}
