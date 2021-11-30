import { MAX, MIN } from "./Comparable.ts";

export const FILTERS_INTERNAL = Symbol("FILTERS_INTERNAL");

export type BetweenOptions = {
  includeMin?: boolean;
  includeMax?: boolean;
};

export type Filter<V> =
  | { kind: "and"; left: Filter<V>; right: Filter<V> }
  | { kind: "or"; left: Filter<V>; right: Filter<V> }
  | { kind: "not"; filter: Filter<V> }
  | { kind: "oneOf"; values: Array<V> }
  | { kind: "equal"; value: V }
  | {
      kind: "between";
      min: V | typeof MIN;
      max: V | typeof MAX;
      options?: BetweenOptions;
    };

export const filters = {
  and<V>(left: Filter<V>, right: Filter<V>): Filter<V> {
    return { kind: "and", left, right };
  },
  or<V>(left: Filter<V>, right: Filter<V>): Filter<V> {
    return { kind: "or", left, right };
  },
  not<V>(filter: Filter<V>): Filter<V> {
    return { kind: "not", filter };
  },
  oneOf<V>(...values: Array<V>): Filter<V> {
    return { kind: "oneOf", values };
  },
  between<V>(
    min: V | typeof MIN,
    max: V | typeof MAX,
    options?: BetweenOptions
  ): Filter<V> {
    return { kind: "between", min, max, options };
  },

  equal<V>(value: V): Filter<V> {
    return { kind: "equal", value };
  },
  eq<V>(value: V): Filter<V> {
    return this.equal(value);
  },

  notEqual<V>(value: V): Filter<V> {
    return this.not(this.equal(value));
  },
  ne<V>(value: V): Filter<V> {
    return this.notEqual(value);
  },

  lessThan<V>(value: V): Filter<V> {
    return this.between(MIN, value, { includeMax: false });
  },
  lt<V>(value: V): Filter<V> {
    return this.lessThan(value);
  },

  greaterThan<V>(value: V): Filter<V> {
    return this.between(value, MAX, { includeMin: false });
  },
  gt<V>(value: V): Filter<V> {
    return this.greaterThan(value);
  },

  lessThanOrEqual<V>(value: V): Filter<V> {
    return this.between(MIN, value, { includeMax: true });
  },
  lte<V>(value: V): Filter<V> {
    return this.lessThanOrEqual(value);
  },

  greaterThanOrEqual<V>(value: V): Filter<V> {
    return this.between(value, MAX, { includeMin: true });
  },
  gte<V>(value: V): Filter<V> {
    return this.greaterThanOrEqual(value);
  },
} as const;
