import { expect, test } from "bun:test";
import { bigrams, chain, entries, slice } from "./iters.js";

test("entries()", () => {
  expect([...entries([])]).toEqual([]);
  expect([...entries([1, 2, 3])]).toEqual([
    [0, 1],
    [1, 2],
    [2, 3],
  ]);
});

test("slice()", () => {
  expect([...slice([1, 2, 3])]).toEqual([1, 2, 3]);
  expect([...slice([1, 2, 3], 1)]).toEqual([2, 3]);
  expect([...slice([1, 2, 3], 1, 2)]).toEqual([2]);
  expect([...slice([1, 2, 3], 0, undefined, 2)]).toEqual([1, 3]);
  expect([...slice([1, 2, 3], 2, -1, -1)]).toEqual([3, 2, 1]);
  expect([...slice([1, 2, 3], 2, 0, -1)]).toEqual([3, 2]);
  expect(() => slice([], 0, 0, 0)).toThrow("zero stride");
});

test("chain()", () => {
  expect([...chain([1, 2, 3], [4, 5], [6])]).toEqual([1, 2, 3, 4, 5, 6]);
});

test("bigrams()", () => {
  expect([...bigrams([1, 2, 3, 4])]).toEqual([
    [1, 2],
    [2, 3],
    [3, 4],
  ]);
});
