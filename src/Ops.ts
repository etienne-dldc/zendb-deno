import { MAX, MIN } from "./CompareFn.ts";

export const OPS_INTERNAL = Symbol("OPS_INTERNAL");

export type BetweenOptions = {
  includeMin?: boolean;
  includeMax?: boolean;
};

export type Op<V> =
  | { kind: "and"; left: Op<V>; right: Op<V> }
  | { kind: "or"; left: Op<V>; right: Op<V> }
  | { kind: "not"; op: Op<V> }
  | { kind: "oneOf"; values: Array<V> }
  | { kind: "equal"; value: V }
  | {
      kind: "between";
      min: V | typeof MIN;
      max: V | typeof MAX;
      options?: BetweenOptions;
    };

export const ops = {
  and<V>(left: Op<V>, right: Op<V>): Op<V> {
    return { kind: "and", left, right };
  },
  or<V>(left: Op<V>, right: Op<V>): Op<V> {
    return { kind: "or", left, right };
  },
  not<V>(op: Op<V>): Op<V> {
    return { kind: "not", op };
  },
  oneOf<V>(...values: Array<V>): Op<V> {
    return { kind: "oneOf", values };
  },
  between<V>(
    min: V | typeof MIN,
    max: V | typeof MAX,
    options?: BetweenOptions
  ): Op<V> {
    return { kind: "between", min, max, options };
  },

  equal<V>(value: V): Op<V> {
    return { kind: "equal", value };
  },
  eq<V>(value: V): Op<V> {
    return this.equal(value);
  },

  notEqual<V>(value: V): Op<V> {
    return this.not(this.equal(value));
  },
  ne<V>(value: V): Op<V> {
    return this.notEqual(value);
  },

  lessThan<V>(value: V): Op<V> {
    return this.between(MIN, value, { includeMax: false });
  },
  lt<V>(value: V): Op<V> {
    return this.lessThan(value);
  },

  greaterThan<V>(value: V): Op<V> {
    return this.between(value, MAX, { includeMin: false });
  },
  gt<V>(value: V): Op<V> {
    return this.greaterThan(value);
  },

  lessThanOrEqual<V>(value: V): Op<V> {
    return this.between(MIN, value, { includeMax: true });
  },
  lte<V>(value: V): Op<V> {
    return this.lessThanOrEqual(value);
  },

  greaterThanOrEqual<V>(value: V): Op<V> {
    return this.between(value, MAX, { includeMin: true });
  },
  gte<V>(value: V): Op<V> {
    return this.greaterThanOrEqual(value);
  },
} as const;
