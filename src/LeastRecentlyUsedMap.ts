// From https://deno.land/x/btrdb@v0.5.1
/** Implements LRU map, but no automatically removing */

type Entry<K, T> = {
  key: K;
  value: T;
  older: Entry<K, T> | null;
  newer: Entry<K, T> | null;
};

export class LeastRecentlyUsedMap<K, T> {
  protected readonly map = new Map<K, Entry<K, T>>();

  protected newest: Entry<K, T> | null = null;
  protected oldest: Entry<K, T> | null = null;

  public get size() {
    return this.map.size;
  }

  public add(key: K, val: T) {
    const entry: Entry<K, T> = {
      key,
      value: val,
      older: this.newest,
      newer: null,
    };
    this.map.set(key, entry);
    if (this.newest !== null) this.newest.newer = entry;
    this.newest = entry;
    if (this.oldest === null) this.oldest = entry;
  }

  public set(key: K, val: T) {
    this.delete(key);
    this.add(key, val);
  }

  public get(key: K): T | undefined {
    const entry = this.map.get(key);
    if (entry === undefined) return undefined;
    if (entry !== this.newest) {
      if (entry === this.oldest) {
        this.oldest = entry.newer;
        this.oldest!.older = null;
      } else {
        entry.newer!.older = entry.older;
        entry.older!.newer = entry.newer;
      }
      this.newest!.newer = entry;
      entry.older = this.newest;
      entry.newer = null;
      this.newest = entry;
    }
    return entry.value;
  }

  public delete(key: K) {
    const entry = this.map.get(key);
    if (entry === undefined) return false;
    this.map.delete(key);
    if (entry === this.newest) {
      this.newest = entry.older;
      if (this.newest) this.newest.newer = null;
      else this.oldest = null;
    } else if (entry === this.oldest) {
      this.oldest = entry.newer;
      this.oldest!.older = null;
    } else {
      entry.newer!.older = entry.older;
      entry.older!.newer = entry.newer;
    }
    return true;
  }

  /**
   * Return false in cb to stop the loop
   */
  public traverseFromOldest(cb: (val: T, key: K) => void | false) {
    for (let node = this.oldest; node !== null; node = node.newer) {
      const res = cb(node.value, node.key);
      if (res === false) {
        break;
      }
    }
  }
}
