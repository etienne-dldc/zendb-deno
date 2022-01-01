import {
  Comparable,
  MAX,
  MIN,
  compareOrder,
  sortAndDedupe,
} from "./Comparable.ts";

export type Bound<V extends Comparable> = { value: V; inclusive: boolean };

export type Range<V extends Comparable> = { min: Bound<V>; max: Bound<V> };

// list of non-overlapping ranges in ascending order
export type Ranges<V extends Comparable> = Array<Range<V>>;

export function range<V extends Comparable>(
  min: V,
  max: V,
  options: { includeMin?: boolean; includeMax?: boolean } = {}
): Range<V> {
  const { includeMin = true, includeMax = true } = options;
  return {
    min: { value: min, inclusive: includeMin },
    max: { value: max, inclusive: includeMax },
  };
}

export function unionRanges<V extends Comparable>(
  left: Ranges<V>,
  right: Ranges<V>
): Ranges<V> {
  if (left.length === 0 && right.length === 0) {
    return [];
  }
  if (left.length === 0) {
    return right;
  }
  if (right.length === 0) {
    return left;
  }
  return mergeRanges(left, right, "union");
}

export function intersectRanges<V extends Comparable>(
  left: Ranges<V>,
  right: Ranges<V>
): Ranges<V> {
  if (left.length === 0 || right.length === 0) {
    return [];
  }
  return mergeRanges(left, right, "intersect");
}

export function complementRanges<V extends Comparable>(
  ranges: Ranges<V>
): Ranges<V> {
  if (ranges.length === 0) {
    return [range(MIN as V, MAX as V)];
  }
  const res: Ranges<V> = [];
  if (ranges.length === 1) {
    const { min, max } = ranges[0];
    if (min.value !== MIN) {
      res.push(range(MIN as V, min.value, { includeMax: !min.inclusive }));
    }
    if (max.value !== MAX) {
      res.push(range(max.value, MAX as V, { includeMin: !max.inclusive }));
    }
    return res;
  }
  for (const [i, { min, max }] of ranges.entries()) {
    const isFirst = i === 0;
    const isLast = i === ranges.length - 1;
    if (isFirst && min.value !== MIN) {
      // add first
      res.push(
        range(MIN as V, min.value, {
          includeMin: true,
          includeMax: !min.inclusive,
        })
      );
    }
    if (isLast) {
      if (max.value !== MAX) {
        // add last
        res.push(
          range(max.value, MAX as V, {
            includeMin: !max.inclusive,
            includeMax: true,
          })
        );
      }
      return res;
    }
    // add between
    const { min: nextMin } = ranges[i + 1];
    res.push(
      range(max.value, nextMin.value, {
        includeMin: !max.inclusive,
        includeMax: !nextMin.inclusive,
      })
    );
  }
  return res;
}

type InsideRangeResult =
  | { inside: true; includeMin: boolean; includeMax: boolean }
  | { inside: false };

function mergeRanges<V extends Comparable>(
  left: Ranges<V>,
  right: Ranges<V>,
  mode: "union" | "intersect"
): Ranges<V> {
  const steps: Array<V> = [];
  for (const range of left) {
    steps.push(range.min.value);
    steps.push(range.max.value);
  }
  for (const range of right) {
    steps.push(range.min.value);
    steps.push(range.max.value);
  }
  const sorted = sortAndDedupe(steps) as Array<V>;
  const res: Ranges<V> = [];
  const lRest: Ranges<V> = [];
  const lPoints: Array<Range<V>> = [];
  const rRest: Ranges<V> = [];
  const rPoints: Array<Range<V>> = [];
  left.forEach((range) => {
    if (isPointRange(range)) {
      lPoints.push(range);
    } else {
      lRest.push(range);
    }
  });
  right.forEach((range) => {
    if (isPointRange(range)) {
      rPoints.push(range);
    } else {
      rRest.push(range);
    }
  });
  let l: Range<V> | null = null;
  let r: Range<V> | null = null;
  let currentSegment: Range<V> | null = null;

  sorted.forEach((pos, index) => {
    if (index > 0) {
      const [min, max] = [sorted[index - 1], pos];
      const [leftState, lCurrent] = getSideState(l, min, max, lRest);
      l = lCurrent;
      const [rightState, rCurrent] = getSideState(r, min, max, rRest);
      r = rCurrent;
      currentSegment = handleSegment(
        currentSegment,
        min,
        max,
        leftState,
        rightState,
        res,
        mode
      );
    }
    // handle points
    const lPoint =
      lPoints.length > 0 && compareOrder(lPoints[0].min.value, "equal", pos)
        ? lPoints.shift()!
        : null;
    const rPoint =
      rPoints.length > 0 && compareOrder(rPoints[0].min.value, "equal", pos)
        ? rPoints.shift()!
        : null;
    const includePoint =
      mode === "intersect" ? lPoint && rPoint : lPoint || rPoint;
    if (includePoint) {
      if (currentSegment) {
        currentSegment = range(currentSegment.min.value, pos, {
          includeMin: currentSegment.min.inclusive,
          includeMax: true,
        });
      } else {
        currentSegment = range(pos, pos);
      }
    }
  });
  if (currentSegment !== null) {
    res.push(currentSegment);
  }
  return res;
}

function handleSegment<V extends Comparable>(
  currentSegment: Range<V> | null,
  min: V,
  max: V,
  leftState: InsideRangeResult,
  rightState: InsideRangeResult,
  res: Ranges<V>,
  mode: "union" | "intersect"
): Range<V> | null {
  // handle segment

  const keepLeft = leftState.inside;
  const keepRight = rightState.inside;
  const keepSegment =
    mode === "intersect" ? keepLeft && keepRight : keepLeft || keepRight;

  if (keepSegment) {
    // keep segment
    const includeLeftMin = leftState.inside && leftState.includeMin;
    const includeLeftMax = leftState.inside && leftState.includeMax;
    const includeRightMin = rightState.inside && rightState.includeMin;
    const includeRightMax = rightState.inside && rightState.includeMax;
    const includeMin =
      mode === "intersect"
        ? includeLeftMin && includeRightMin
        : includeLeftMin || includeRightMin;
    const includeMax =
      mode === "intersect"
        ? includeLeftMax && includeRightMax
        : includeLeftMax || includeRightMax;
    if (currentSegment === null) {
      return range(min, max, { includeMin, includeMax });
    }
    // can we merge with previous segment?
    if (currentSegment.max.inclusive || includeMin) {
      // merge
      return range(currentSegment.min.value, max, {
        includeMin: currentSegment.min.inclusive,
        includeMax,
      });
    }
    // can't merge
    res.push(currentSegment);
    return range(min, max, { includeMin, includeMax });
  }
  if (currentSegment !== null) {
    res.push(currentSegment);
    return null;
  }
  return null;
}

function getSideState<V extends Comparable>(
  range: null | Range<V>,
  min: V,
  max: V,
  rest: Ranges<V>
): [result: InsideRangeResult, current: Range<V> | null] {
  if (range) {
    const state = isInsideRange(range, min, max);
    if (state.inside === false) {
      return [state, null];
    }
    return [state, range];
  }
  const maybeNextLeft = rest[0] ?? null;
  const state = isInsideRange(maybeNextLeft, min, max);
  if (state.inside) {
    return [state, rest.shift()!];
  }
  return [state, null];
}

export function isInsideRange<V extends Comparable>(
  range: null | Range<V>,
  min: V,
  max: V
): InsideRangeResult {
  if (range === null) {
    return { inside: false };
  }
  if (
    compareOrder(range.min.value, "isBeforeOrEqual", min) &&
    compareOrder(max, "isBeforeOrEqual", range.max.value)
  ) {
    const includeMin =
      compareOrder(range.min.value, "equal", min) && range.min.inclusive;
    const includeMax =
      compareOrder(max, "equal", range.max.value) && range.max.inclusive;
    return { inside: true, includeMin, includeMax };
  }
  return { inside: false };
}

function isPointRange<V extends Comparable>(range: null | Range<V>): boolean {
  if (range === null) {
    return false;
  }
  return compareOrder(range.min.value, "equal", range.max.value);
}
