import { assert } from "../src/utils";

test("assert throws", () => {
  expect(() => assert(false)).toThrow("internal error: failed assert");
  expect(() => assert(false, "custom")).toThrow("internal error: custom");
});
