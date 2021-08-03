import { topological } from "../../../src/sugiyama/layering/topological";
import { doub, square } from "../../examples";
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

test("topological() fails passing an arg to constructor", () => {
  expect(() => topological(null as never)).toThrow(
    "got arguments to topological"
  );
});
