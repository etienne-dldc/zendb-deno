import { assertEquals } from "https://deno.land/std@0.116.0/testing/asserts.ts";
import { MIN, MAX, ComparableExtrems } from "./Comparable.ts";
import {
  complementRanges,
  Range,
  range,
  Ranges,
  unionRanges,
} from "./Range.ts";

function r(
  start: number | ComparableExtrems,
  end: number | ComparableExtrems,
  options: { includeMin?: boolean; includeMax?: boolean } = {}
): Range<number | ComparableExtrems> {
  return range(start, end, options);
}

Deno.test("range function workd", () => {
  assertEquals(r(1, 3), {
    max: { inclusive: true, value: 3 },
    min: { inclusive: true, value: 1 },
  });
});

Deno.test("complementRanges should invert", () => {
  assertEquals(complementRanges([r(1, 3), r(5, 7)]), [
    r(MIN, 1, { includeMax: false }),
    r(3, 5, { includeMin: false, includeMax: false }),
    r(7, MAX, { includeMin: false }),
  ]);
});

Deno.test("complementRanges should invert when limits not included", () => {
  assertEquals(
    complementRanges([
      r(1, 3, { includeMin: false, includeMax: false }),
      r(5, 7, { includeMin: false, includeMax: false }),
    ]),
    [r(MIN, 1), r(3, 5), r(7, MAX)]
  );
});

Deno.test("complementRanges should invert empty", () => {
  assertEquals(complementRanges([]), [r(MIN, MAX)]);
});

Deno.test("complementRanges should invert single", () => {
  assertEquals(complementRanges([r(1, 3)]), [
    r(MIN, 1, { includeMax: false }),
    r(3, MAX, { includeMin: false }),
  ]);
});

Deno.test("complementRanges should invert single MIN-MAX", () => {
  assertEquals(complementRanges([r(MIN, MAX)]), []);
});

Deno.test("complementRanges should invert single X-MAX", () => {
  assertEquals(complementRanges([r(12, MAX)]), [
    r(MIN, 12, { includeMax: false }),
  ]);
});

Deno.test("complementRanges should invert single MIN-X", () => {
  assertEquals(complementRanges([r(MIN, 12)]), [
    r(12, MAX, { includeMin: false }),
  ]);
});

Deno.test("complementRanges should invert", () => {
  assertEquals(complementRanges([r(1, 3), r(5, 7)]), [
    r(MIN, 1, { includeMax: false }),
    r(3, 5, { includeMin: false, includeMax: false }),
    r(7, MAX, { includeMin: false }),
  ]);
});

Deno.test("complementRanges twice should return original", () => {
  const ranges: Array<Ranges<number | ComparableExtrems>> = [
    [],
    [r(1, 3)],
    [r(1, 3), r(5, 7)],
    [r(1, 3), r(5, 7), r(9, 11)],
    [r(MIN, 12)],
  ];

  for (const r1 of ranges) {
    const r2 = complementRanges(r1);
    assertEquals(r1, complementRanges(r2));
  }
});

Deno.test("unionRanges [(1=>3), (5=>7)] | []=> [(1=>3), (5=>7)]", () => {
  assertEquals(unionRanges([r(1, 3), r(5, 7)], []), [r(1, 3), r(5, 7)]);
});

Deno.test("unionRanges [(1=>3)] | [(5=>7)]=> [(1=>3), (5=>7)]", () => {
  assertEquals(unionRanges([r(1, 3)], [r(5, 7)]), [r(1, 3), r(5, 7)]);
});

Deno.test("unionRanges [(1=>3)] | [(3=>5)]=> [(1=>5)]", () => {
  assertEquals(unionRanges([r(1, 3)], [r(3, 5)]), [r(1, 5)]);
});

Deno.test("unionRanges [(1=>)3] | [(3=>5)] =>  [(1=>5)]", () => {
  assertEquals(unionRanges([r(1, 3, { includeMax: false })], [r(3, 5)]), [
    r(1, 5),
  ]);
});

Deno.test("unionRanges [(1=>)3] | [3(=>5)] =>  [(1=>)3, 3(=>5)]", () => {
  assertEquals(
    unionRanges(
      [r(1, 3, { includeMax: false })],
      [r(3, 5, { includeMin: false })]
    ),
    [r(1, 3, { includeMax: false }), r(3, 5, { includeMin: false })]
  );
});

Deno.test("unionRanges [(1=>)3] | [(3=>3)] =>  [(1=>3)]", () => {
  assertEquals(unionRanges([r(1, 3, { includeMax: false })], [r(3, 3)]), [
    r(1, 3),
  ]);
});

Deno.test("unionRanges [(1=>1)] | [(3=>3)] =>  [(1=>1), (3=>3)]", () => {
  assertEquals(unionRanges([r(1, 1)], [r(3, 3)]), [r(1, 1), r(3, 3)]);
});
