import { SafeMap, assert } from "../src/utils";

test("getThrow throws", () => {
  const map = new SafeMap<string, number>();
  expect(() => {
    map.getThrow("");
  }).toThrow("map doesn't contain key: ");
});

test("assert throws", () => {
  expect(() => assert(false)).toThrow("internal error: failed assert");
  expect(() => assert(false, "custom")).toThrow("internal error: custom");
});
