import { assert, setEqual } from "../src/utils";

test("assert throws", () => {
  expect(assert(true)).toBeUndefined();
  expect(() => assert(false)).toThrow("internal error: failed assert");
});

test("setEquals faisl for different sizes", () => {
  expect(setEqual(new Set(), new Set([1]))).toBe(false);
});
