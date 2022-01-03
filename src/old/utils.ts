export const ITER = Symbol.for("ZENDB_BUILDER_INTERNAL");
export type ITER = typeof ITER;

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] };

export type Replace<T, K extends keyof T, V> = Omit<T, K> & Record<K, V>;

export type UndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type MakeUndefinedOptional<T> = Omit<T, UndefinedKeys<T>> & {
  [K in UndefinedKeys<T>]?: T[K];
};

export type NilKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : null extends T[K] ? K : never;
}[keyof T];

export type MakeNilOptional<T> = Omit<T, NilKeys<T>> & {
  [K in NilKeys<T>]?: T[K];
};
