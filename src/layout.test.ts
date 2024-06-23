import { expect, test } from "bun:test";
import { graph } from "./graph";
import { cachedNodeSize, splitNodeSize } from "./layout";

test("cachedNodeSize() const", () => {
  const node = graph().node();
  const cached = cachedNodeSize([2, 1]);
  expect(cached(node)).toEqual([2, 1]);
  expect(cached(node)).toEqual([2, 1]);
});

test("cachedNodeSize() const error", () => {
  expect(() => cachedNodeSize([0, 1])).toThrow(
    "all node sizes must be positive",
  );
});

test("cachedNodeSize() callable", () => {
  const node = graph().node();
  const calls: [number] = [0];
  const cached = cachedNodeSize(() => {
    calls[0] += 1;
    return [2, 1];
  });
  expect(cached(node)).toEqual([2, 1]);
  expect(cached(node)).toEqual([2, 1]);
  expect(calls[0]).toBe(1);
});

test("cachedNodeSize() callable raises", () => {
  const node = graph().node();
  const cached = cachedNodeSize(() => [0, 1]);
  expect(() => cached(node)).toThrow("all node sizes must be positive");
});

test("splitNodeSize() const", () => {
  const node = graph().node();
  const [x, y] = splitNodeSize([0, 1]);
  expect(x(node)).toBe(0);
  expect(y(node)).toBe(1);
});

test("splitNodeSize() callable", () => {
  const node = graph().node();
  const [x, y] = splitNodeSize(() => [0, 1]);
  expect(x(node)).toBe(0);
  expect(y(node)).toBe(1);
});
