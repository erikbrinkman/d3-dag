import { setIntersect, setMultimapDelete, setPop } from "./collections";

test("setPop()", () => {
  expect(setPop(new Set())).toBeUndefined();
  expect(setPop(new Set(["a"]))).toBe("a");
  expect(["a", "b"]).toContain(setPop(new Set(["a", "b"])));
});

test("setMultimapDelete()", () => {
  const empty = new Map<string, Set<number>>();
  setMultimapDelete(empty, "", 0);
  expect(empty).toEqual(new Map());
});

test("setIntersect()", () => {
  expect(setIntersect(new Set([1]), new Set([2]))).toBeFalsy();
  expect(setIntersect(new Set([1]), new Set([1, 2]))).toBeTruthy();
  expect(setIntersect(new Set([2, 1]), new Set([1]))).toBeTruthy();
});
