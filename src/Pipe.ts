import { Traverser, traverserToIterable } from "./Utils.ts";

export type Entry<Key, Data> = [Key, Data];

export class PipeSingleReadonly<Key, Data, Maybe extends boolean> {
  protected internal: null | Entry<Key, Data>;

  constructor(entry: null | Entry<Key, Data>) {
    this.internal = entry;
  }

  transform<Out>(
    _transform: (item: Data) => Out
  ): PipeSingleReadonly<Key, Out, Maybe> {
    throw new Error("Not Implemented");
  }

  filter(_filter: (val: Data) => boolean): PipeSingle<Key, Data, true> {
    throw new Error("Not Implemented");
  }

  value(): Maybe extends true ? Data | null : Data {
    throw new Error("Not Implemented");
  }

  key(): Maybe extends true ? Key | null : Key {
    throw new Error("Not Implemented");
  }

  entry(): Maybe extends true ? Entry<Key, Data> | null : Entry<Key, Data> {
    throw new Error("Not Implemented");
  }
}

export class PipeSingle<
  Key,
  Data,
  Maybe extends boolean
> extends PipeSingleReadonly<Key, Data, Maybe> {
  /**
   * We could put delete() in PipeSingleReadonly and allow transform().delete()
   * but we don't want delete().update() to be possible
   * This is probably fine because you can delete().transform() which produce the same result
   */
  delete(): PipeSingleReadonly<Key, Data, Maybe> {
    throw new Error("Not Implemented");
  }

  /**
   * Throw if the entry does not exists
   */
  update(_update: Data | ((item: Data) => Data)): PipeSingle<Key, Data, Maybe> {
    throw new Error("Not Implemented");
  }

  upsert(
    _data: Data | ((iDataem: Data | null) => Data)
  ): PipeSingle<Key, Data, false> {
    throw new Error("Not Implemented");
  }
}

export class PipeCollection<Key, Data> {
  #traverser: Traverser<Key, Data>;

  constructor(traverser: Traverser<Key, Data>) {
    this.#traverser = traverser;
  }

  filter(_fn: (val: Data) => boolean): PipeCollection<Key, Data> {
    throw new Error("Not Implemented");
  }

  transform<Out>(_fn: (item: Data) => Out): PipeCollection<Key, Out> {
    throw new Error("Not Implemented");
  }

  // throw if more count is not one
  one(): PipeSingle<Key, Data, false> {
    throw new Error("Not Implemented");
  }

  // throw if count > 1
  maybeOne(): PipeSingle<Key, Data, true> {
    throw new Error("Not Implemented");
  }

  // throw if count < 1
  first(): PipeSingle<Key, Data, false> {
    throw new Error("Not Implemented");
  }

  // never throw
  maybeFirst(): PipeSingle<Key, Data, true> {
    throw new Error("Not Implemented");
  }

  update(_fn: (item: Data) => Data): this {
    throw new Error("Not Implemented");
  }

  delete(): this {
    throw new Error("Not Implemented");
  }

  valuesArray(): Array<Data> {
    return Array.from(this.values());
  }

  values(): Iterable<Data> {
    return traverserToIterable(this.#traverser, (_key, value) => value);
  }

  entriesArray(): Array<Entry<Key, Data>> {
    return Array.from(this.entries());
  }

  entries(): Iterable<Entry<Key, Data>> {
    return traverserToIterable(this.#traverser, (key, value) => [key, value]);
  }

  keysArray(): Array<Key> {
    return Array.from(this.keys());
  }

  keys(): Iterable<Key> {
    return traverserToIterable(this.#traverser, (key) => key);
  }
}
