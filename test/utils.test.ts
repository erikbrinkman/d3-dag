import { SafeMap } from "../src/utils";

test("getThrow throws", () => {
  const map = new SafeMap<string, number>();
  expect(() => {
    map.getThrow("");
  }).toThrow("map doesn't contain key: ");
});
