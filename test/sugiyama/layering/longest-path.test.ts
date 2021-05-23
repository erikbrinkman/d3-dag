import { ccoz, square } from "../../examples";

import { longestPath } from "../../../src/sugiyama/layering/longest-path";
import { stratify } from "../../../src/dag/stratify";
import { toLayers } from "../utils";

const changes = [{ id: "0" }, { id: "1" }, { id: "2", parentIds: ["1"] }];

test("longestPath() works for square", () => {
  const dag = square();
  longestPath()(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("longestPath() works for disconnected graph", () => {
  const dag = ccoz();
  longestPath()(dag);
  const layers = toLayers(dag);
  expect(layers.length).toBeTruthy();
});

test("longestPath() works for topDown", () => {
  const dag = stratify()(changes);
  const layering = longestPath();
  expect(layering.topDown()).toBeTruthy();
  layering(dag);
  const layers = toLayers(dag);
  expect([[0, 1], [2]]).toEqual(layers);
});

test("longestPath() works for bottomUp", () => {
  const dag = stratify()(changes);
  const layering = longestPath().topDown(false);
  expect(layering.topDown()).toBeFalsy();
  layering(dag);
  const layers = toLayers(dag);
  expect([[1], [0, 2]]).toEqual(layers);
});

test("longestPath() fails passing an arg to constructor", () => {
  // @ts-expect-error longest-path takes no arguments
  expect(() => longestPath(undefined)).toThrow("got arguments to longestPath");
});
