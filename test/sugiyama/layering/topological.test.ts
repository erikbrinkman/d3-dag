import { doub, square } from "../../examples";

import { toLayers } from "../utils";
import { topological } from "../../../src/sugiyama/layering/topological";

test("topological() works for square", () => {
  const dag = square();
  topological()(dag);
  const layers = toLayers(dag);
  expect([
    [[0], [1], [2], [3]],
    [[0], [2], [1], [3]]
  ]).toContainEqual(layers);
});

test("topological() works for disconnected graph", () => {
  const dag = doub();
  topological()(dag);
  const layers = toLayers(dag);
  expect([
    [[0], [1]],
    [[1], [0]]
  ]).toContainEqual(layers);
});

test("topological() fails passing an arg to constructor", () => {
  // @ts-expect-error topological takes no arguments
  expect(() => topological(undefined)).toThrow("got arguments to topological");
});
