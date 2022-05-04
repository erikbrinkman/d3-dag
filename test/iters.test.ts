import { entries, every, flatMap, map, reduce } from "../src/iters";

test("entries()", () => {
  expect([...entries([])]).toEqual([]);
  expect([...entries([1, 2, 3])]).toEqual([
    [0, 1],
    [1, 2],
    [2, 3],
  ]);
});

test("every()", () => {
  expect(every([1, 2, 3], (v) => v > 0)).toBeTruthy();
  expect(every([1, -2, 3], (v) => v > 0)).toBeFalsy();
});

test("flatMap()", () => {
  expect([...flatMap([1, 2], (v, i) => [v, i])]).toEqual([1, 0, 2, 1]);
  expect([...flatMap([1, 2], (v) => [v])]).toEqual([1, 2]);
});

test("map()", () => {
  expect([...map([1, 2, 3], (v) => v.toString())]).toEqual(["1", "2", "3"]);
  expect([...map<number, string>([], (v) => v.toString())]).toEqual([]);
});

test("reduce()", () => {
  expect(reduce([1, 2, 3], (a, b) => a + b, 0)).toBeCloseTo(6);
  expect(reduce([1, 2, 3], (a, b) => a + b, "")).toBe("123");
});
