import { Comparable, MAX, MIN } from "./Comparable.ts";

export const FILTERS_INTERNAL = Symbol("FILTERS_INTERNAL");

export type BetweenOptions = {
  includeMin?: boolean;
  includeMax?: boolean;
};

export type Filter<V extends Comparable> =
  | { kind: "and"; left: Filter<V>; right: Filter<V> }
  | { kind: "or"; left: Filter<V>; right: Filter<V> }
  | { kind: "not"; filter: Filter<V> }
  | { kind: "oneOf"; values: Array<V> }
  | { kind: "equal"; value: V }
  | { kind: "between"; min: V; max: V; options?: BetweenOptions };

export const filters = {
  and<V extends Comparable>(left: Filter<V>, right: Filter<V>): Filter<V> {
    return { kind: "and", left, right };
  },
  or<V extends Comparable>(left: Filter<V>, right: Filter<V>): Filter<V> {
    return { kind: "or", left, right };
  },
  not<V extends Comparable>(filter: Filter<V>): Filter<V> {
    return { kind: "not", filter };
  },
  oneOf<V extends Comparable>(...values: Array<V>): Filter<V> {
    return { kind: "oneOf", values };
  },
  between<V extends Comparable>(
    min: V,
    max: V,
    options?: BetweenOptions
  ): Filter<V> {
    return { kind: "between", min, max, options };
  },

  equal<V extends Comparable>(value: V): Filter<V> {
    return { kind: "equal", value };
  },
  eq<V extends Comparable>(value: V): Filter<V> {
    return this.equal(value);
  },

  notEqual<V extends Comparable>(value: V): Filter<V> {
    return this.not(this.equal(value));
  },
  ne<V extends Comparable>(value: V): Filter<V> {
    return this.notEqual(value);
  },

  lessThan<V extends Comparable>(value: V): Filter<V> {
    return this.between(MIN as V, value, { includeMax: false });
  },
  lt<V extends Comparable>(value: V): Filter<V> {
    return this.lessThan(value);
  },

  greaterThan<V extends Comparable>(value: V): Filter<V> {
    return this.between(value, MAX as V, { includeMin: false });
  },
  gt<V extends Comparable>(value: V): Filter<V> {
    return this.greaterThan(value);
  },

  lessThanOrEqual<V extends Comparable>(value: V): Filter<V> {
    return this.between(MIN as V, value, { includeMax: true });
  },
  lte<V extends Comparable>(value: V): Filter<V> {
    return this.lessThanOrEqual(value);
  },

  greaterThanOrEqual<V extends Comparable>(value: V): Filter<V> {
    return this.between(value, MAX as V, { includeMin: true });
  },
  gte<V extends Comparable>(value: V): Filter<V> {
    return this.greaterThanOrEqual(value);
  },
} as const;
