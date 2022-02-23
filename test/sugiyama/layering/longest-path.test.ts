import { stratify } from "../../../src/dag/create";
import { longestPath } from "../../../src/sugiyama/layering/longest-path";
import { ccoz, eye, multi, square } from "../../examples";
import { getLayers } from "../utils";

const changes = [{ id: "0" }, { id: "1" }, { id: "2", parentIds: ["1"] }];

test("longestPath() works for square", () => {
  const dag = square();
  longestPath()(dag);
  const layers = getLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("longestPath() works for disconnected graph", () => {
  const dag = ccoz();
  longestPath()(dag);
  const layers = getLayers(dag);
  expect(layers.length).toBeTruthy();
});

test("longestPath() works for topDown", () => {
  const dag = stratify()(changes);
  const layering = longestPath();
  expect(layering.topDown()).toBeTruthy();
  layering(dag);
  const layers = getLayers(dag);
  expect([[0, 1], [2]]).toEqual(layers);
});

test("longestPath() works for bottomUp", () => {
  const dag = stratify()(changes);
  const layering = longestPath().topDown(false);
  expect(layering.topDown()).toBeFalsy();
  layering(dag);
  const layers = getLayers(dag);
  expect([[1], [0, 2]]).toEqual(layers);
});

test("longestPath() works for multi dag", () => {
  const dag = multi();
  const layering = longestPath();
  layering(dag);
  const layers = getLayers(dag);
  expect([[0], [], [1]]).toEqual(layers);
});

test("longestPath() works for multi dag bottom up", () => {
  const dag = multi();
  const layering = longestPath().topDown(false);
  layering(dag);
  const layers = getLayers(dag);
  expect([[0], [], [1]]).toEqual(layers);
});

test("longestPath() works for eye multi dag", () => {
  const dag = eye();
  const layering = longestPath();
  layering(dag);
  const layers = getLayers(dag);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("longestPath() works for eye multi dag bottom up", () => {
  const dag = eye();
  const layering = longestPath().topDown(false);
  layering(dag);
  const layers = getLayers(dag);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("longestPath() fails passing an arg to constructor", () => {
  expect(() => longestPath(null as never)).toThrow(
    "got arguments to longestPath"
  );
});
