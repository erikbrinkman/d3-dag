import { expect, test } from "bun:test";
import { setMultimapDelete, setPop } from "./collections.js";

test("setPop()", () => {
  expect(setPop(new Set())).toBeUndefined();
  expect(setPop(new Set(["a"]))).toBe("a");
  expect(["a", "b"]).toContain(setPop(new Set(["a", "b"]))!);
});

test("setMultimapDelete()", () => {
  const empty = new Map<string, Set<number>>();
  setMultimapDelete(empty, "", 0);
  expect(empty).toEqual(new Map());
});
