// deno-lint-ignore-file no-explicit-any

export const PRIV = Symbol.for("ZENDB_PRIVATE");
export type PRIV = typeof PRIV;

export function sqlQuote(str: string | number | symbol): string {
  if (typeof str !== "string") {
    throw new Error(`Expected string, got ${typeof str}`);
  }
  return "`" + str + "`";
}

export function mapObject<
  In extends Record<string, any>,
  Out extends Record<keyof In, any>
>(obj: In, mapper: (key: string, value: In[keyof In]) => Out[keyof In]): Out {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [key, mapper(key, val)])
  ) as any;
}

export function expectNever(val: never): never {
  throw new Error(`Unexpected never ${val}`);
}

type Parts = Array<string | null | undefined>;

function joiner(glue: string, ...parts: Parts): string {
  return parts.filter(Boolean).join(glue);
}

export const join = {
  space: (...parts: Parts): string => joiner(" ", ...parts),
  comma: (...parts: Parts): string => joiner(", ", ...parts),
  all: (...parts: Parts): string => joiner("", ...parts),
};

export function notNil<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) {
    throw new Error(`Expected non-nil value, got ${val}`);
  }
  return val;
}

export type TraverserResult<K, T> = {
  key: K;
  data: T;
} | null;

export type Traverser<K, T> = () => TraverserResult<K, T>;

interface RowsIterator<R> {
  next: () => IteratorResult<R>;
  [Symbol.iterator]: () => RowsIterator<R>;
}

export function traverserFromRowIterator<Key, DataIn, DataOut>(
  iter: RowsIterator<[Key, DataIn]>,
  transform: (data: DataIn) => DataOut
): Traverser<Key, DataOut> {
  let done = false;
  return (): TraverserResult<Key, DataOut> => {
    if (done) {
      return null;
    }
    const row = iter.next();
    if (!row.done) {
      return { key: row.value[0], data: transform(row.value[1]) };
    }
    done = true;
    if (row.value) {
      return { key: row.value[0], data: transform(row.value[1]) };
    }
    return null;
  };
}

export function traverserToIterable<K, T, O>(
  traverser: Traverser<K, T>,
  transform: (key: K, value: T) => O
): Iterable<O> {
  return {
    [Symbol.iterator]: () => {
      let nextRes = traverser();
      return {
        next: (): IteratorResult<O> => {
          if (nextRes === null) {
            return { done: true, value: undefined };
          }
          const nextNextRes = traverser();
          const result: IteratorResult<O> = {
            done: nextNextRes === null ? undefined : false,
            value: transform(nextRes.key, nextRes.data),
          };
          nextRes = nextNextRes;
          return result;
        },
      };
    },
  };
}
