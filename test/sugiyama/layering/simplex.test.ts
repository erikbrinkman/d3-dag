import { doub, ex, square } from "../../examples";

import { DagNode } from "../../../src/dag/node";
import { layeringSimplex } from "../../../src";
import { toLayers } from "../utils";

test("layeringSimplex() works for square", () => {
  const dag = square();
  layeringSimplex()(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("layeringSimplex() respects ranks and gets them", () => {
  const dag = square();
  function ranker(node: DagNode): undefined | number {
    if (node.id === "1") {
      return 1;
    } else if (node.id === "2") {
      return 2;
    } else {
      return undefined;
    }
  }
  const layout = layeringSimplex().rank(ranker);
  expect(layout.rank()).toBe(ranker);
  layout(dag);
  const layers = toLayers(dag);
  expect([[0], [1], [2], [3]]).toEqual(layers);
});

test("layeringSimplex() works for square with debug", () => {
  const dag = square();
  const layer = layeringSimplex().debug(true);
  expect(layer.debug()).toBeTruthy();
  layer(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("layeringSimplex() works for X", () => {
  // NOTE longest path will always produce a dummy node, where layeringSimplex
  // will not
  const dag = ex();
  layeringSimplex()(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3], [4, 5], [6]]).toEqual(layers);
});

test("layeringSimplex() respects equality rank", () => {
  const dag = ex();
  const layout = layeringSimplex().rank((node) => {
    if (node.id === "0") {
      return 0;
    } else if (node.id === "2") {
      return 0;
    } else {
      return undefined;
    }
  });
  layout(dag);
  const layers = toLayers(dag);
  expect([[0, 2], [1], [3], [4, 5], [6]]).toEqual(layers);
});

test("layeringSimplex() works for disconnected dag", () => {
  const dag = doub();
  layeringSimplex()(dag);
  const layers = toLayers(dag);
  expect([[0, 1]]).toEqual(layers);
});

test("layeringSimplex() fails passing an arg to constructor", () => {
  // @ts-expect-error simplex takes no arguments
  expect(() => layeringSimplex(undefined)).toThrow("got arguments to simplex");
});

test("layeringSimplex() fails with ill-defined ranks", () => {
  const dag = square();
  const layout = layeringSimplex().rank((node) => {
    if (node.id === "0") {
      return 1;
    } else if (node.id === "3") {
      return 0;
    } else {
      return undefined;
    }
  });
  expect(() => layout(dag)).toThrow(
    "check that rank accessors are not ill-defined"
  );
});
