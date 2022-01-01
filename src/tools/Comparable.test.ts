// deno-lint-ignore-file no-explicit-any
import { compare, MAX, MIN } from "./Comparable.ts";
import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.116.0/testing/asserts.ts";

function sort(
  arr: Array<any>,
  compareFn?: (a: any, b: any) => number
): Array<any> {
  return [...arr].sort(compareFn);
}

Deno.test("compare numbers", () => {
  assertEquals(
    sort([2, 78, 0, 9, 1, -0, -12, 8, 45], compare),
    [-12, -0, 0, 1, 2, 8, 9, 45, 78]
  );
});

Deno.test("compare strings", () => {
  assertEquals(sort(["hello", "", "salut", "hey", "é", "e", "😀"], compare), [
    "",
    "😀",
    "e",
    "é",
    "hello",
    "hey",
    "salut",
  ]);
});

Deno.test("compare boolean", () => {
  assertEquals(sort([true, false, true, false, false], compare), [
    false,
    false,
    false,
    true,
    true,
  ]);
});

Deno.test("compare mixed types", () => {
  assertEquals(
    sort([0, 1, null, true, false, -45, "test", "demo", 1], compare),
    [null, false, true, -45, 0, 1, 1, "demo", "test"]
  );
});

Deno.test("compare arrays", () => {
  assertEquals(
    sort([[2], [78], [0], [9], [1], [-0], [-12], [8], [45]], compare),
    [[-12], [-0], [0], [1], [2], [8], [9], [45], [78]]
  );
});

Deno.test("compare arrays and values", () => {
  assertEquals(sort([0, [1], 1, [2], 2, [1, 2], [1, 4]], compare), [
    0,
    1,
    [1],
    [1, 2],
    [1, 4],
    2,
    [2],
  ]);
});

Deno.test("everything is between MIN and MAX", () => {
  const data = [
    0,
    1,
    null,
    true,
    false,
    -45,
    "test",
    "demo",
    1,
    Infinity,
    9200,
  ];
  data.forEach((item) => {
    assert(compare(item, MIN) > 0);
    assert(compare(item, MAX) < 0);
  });
});
