import { Comparable } from "./compare.ts";

export type IIndexFn<T, Out extends Comparable> = (item: T) => Out;

export type IIndexObj<T, Out extends Comparable> = {
  treeOrder?: number;
  unique?: boolean;
  fn: IIndexFn<T, Out>;
};

export type IIndex<T, Out extends Comparable> =
  | IIndexFn<T, Out>
  | IIndexObj<T, Out>;

export type IIndexResolved<T, Out extends Comparable> = {
  unique: boolean;
  treeOrder: number;
  fn: IIndexFn<T, Out>;
};

export type IIndexesDesc = Record<string, Comparable>;

export type IIndexes<T, IndexesDesc extends IIndexesDesc> = {
  [K in keyof IndexesDesc]: IIndex<T, IndexesDesc[K]>;
};
