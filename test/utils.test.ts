import { assert } from "../src/utils";

test("assert throws", () => {
  expect(assert(true)).toBeUndefined();
  expect(() => assert(false)).toThrow("internal error: failed assert");
  expect(() => assert(false, "custom")).toThrow("custom");
});
