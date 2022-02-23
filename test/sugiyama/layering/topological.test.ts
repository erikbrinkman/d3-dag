import { topological } from "../../../src/sugiyama/layering/topological";
import { doub, eye, multi, square } from "../../examples";
import { getLayers } from "../utils";

test("topological() works for square", () => {
  const dag = square();
  topological()(dag);
  const layers = getLayers(dag);
  expect([
    [[0], [1], [2], [3]],
    [[0], [2], [1], [3]]
  ]).toContainEqual(layers);
});

test("topological() works for disconnected graph", () => {
  const dag = doub();
  topological()(dag);
  const layers = getLayers(dag);
  expect([
    [[0], [1]],
    [[1], [0]]
  ]).toContainEqual(layers);
});

test("topological() works for multi graph", () => {
  const dag = multi();
  const layer = topological();
  layer(dag);
  const layers = getLayers(dag);
  expect([[0], [], [1]]).toEqual(layers);
});

test("topological() works for eye multi graph", () => {
  const dag = eye();
  const layer = topological();
  layer(dag);
  const layers = getLayers(dag);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("topological() fails passing an arg to constructor", () => {
  expect(() => topological(null as never)).toThrow(
    "got arguments to topological"
  );
});
