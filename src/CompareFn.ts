// deno-lint-ignore-file no-explicit-any

export const MIN = Symbol("MIN");
export const MAX = Symbol("MAX");

export type ComparableValue =
  | null
  | undefined
  | boolean
  | number
  | string
  | Date
  | typeof MIN
  | typeof MAX;
export type Comparable = ComparableValue | Array<ComparableValue>;

const TYPES_ORDER = [
  "min",
  "undefined",
  "null",
  "boolean",
  "nan",
  "number",
  "date",
  "string",
  "boolean",
  "max",
] as const;

function saneTypeof(val: ComparableValue): typeof TYPES_ORDER[number] {
  if (val === MIN) {
    return "min";
  }
  if (val === MAX) {
    return "max";
  }
  if (val === undefined) {
    return "undefined";
  }
  if (val === null) {
    return "null";
  }
  if (val instanceof Date) {
    return "date";
  }
  if (Object.is(val, NaN)) {
    return "nan";
  }
  return typeof val as any;
}

function compareComparableValue(
  a: ComparableValue,
  b: ComparableValue
): number {
  const ta = saneTypeof(a);
  const tb = saneTypeof(b);
  if (ta !== tb) {
    // not the same type order by TYPE_ORDER
    return TYPES_ORDER.indexOf(ta) - TYPES_ORDER.indexOf(tb);
  }
  if (ta === "null" || ta === "undefined" || ta === "nan") {
    return 0;
  }
  if (ta === "string") {
    return (a as string).localeCompare(b as string);
  }
  if (ta === "boolean") {
    // compare as true === 1 and false === -1
    return Number(a) - Number(b);
  }
  if (ta === "number") {
    if (a === 0 && b === 0) {
      // handle -0 case
      const aNeg = Object.is(a, -0);
      const bNeg = Object.is(b, -0);
      // compare b - a to get -0 first
      return Number(bNeg) - Number(aNeg);
    }
    return (a as number) - (b as number);
  }
  if (ta === "date") {
    return (a as Date).getDate() - (b as Date).getDate();
  }
  throw new Error("invalid type");
}

export function compare(a: Comparable, b: Comparable): number {
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray === false && bIsArray === false) {
    return compareComparableValue(a as ComparableValue, b as ComparableValue);
  }
  if (aIsArray === false && bIsArray === true) {
    const firstDiff = compareComparableValue(
      a as ComparableValue,
      (b as Array<ComparableValue>)[0]
    );
    // if equal => non-array first
    return firstDiff === 0 ? -1 : firstDiff;
  }
  if (aIsArray === true && bIsArray === false) {
    const firstDiff = compareComparableValue(
      (a as Array<ComparableValue>)[0],
      b as ComparableValue
    );
    // if equal => non-array first
    return firstDiff === 0 ? 1 : firstDiff;
  }
  // a and b are arrays
  a = a as Array<ComparableValue>;
  b = b as Array<ComparableValue>;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const res = compareComparableValue(a[i], b[i]);
    if (res !== 0) {
      return res;
    }
  }
  return 0;
}

type OrderOp =
  | "equal"
  | "isBefore"
  | "isAfter"
  | "isAfterOrEqual"
  | "isBeforeOrEqual";

const COMPARE_ORDER_MAP: {
  [K in OrderOp]: (a: Comparable, b: Comparable) => boolean;
} = {
  equal: (a, b) => compare(a, b) === 0,
  isBefore: (a, b) => compare(a, b) < 0,
  isAfter: (a, b) => compare(a, b) > 0,
  isBeforeOrEqual: (a, b) => compare(a, b) <= 0,
  isAfterOrEqual: (a, b) => compare(a, b) >= 0,
};

// true if a is before
export function compareOrder(
  a: Comparable,
  op: OrderOp,
  b: Comparable
): boolean {
  return COMPARE_ORDER_MAP[op](a, b);
}
