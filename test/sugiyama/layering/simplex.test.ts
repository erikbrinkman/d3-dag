import { dagStratify, layeringSimplex } from "../../../src";
import { doub, ex, square } from "../../dags";

import { toLayers } from "../utils";

test("layeringSimplex() works for square", () => {
  const dag = dagStratify()(square);
  layeringSimplex()(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("layeringSimplex() works for square with debug", () => {
  const dag = dagStratify()(square);
  const layer = layeringSimplex().debug(true);
  expect(layer.debug()).toBeTruthy();
  layer(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("layeringSimplex() works for X", () => {
  // NOTE longest path will always produce a dummy node, where layeringSimplex
  // will not
  const dag = dagStratify()(ex);
  layeringSimplex()(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3], [4, 5], [6]]).toEqual(layers);
});

test("layeringSimplex() fails for disconnected dag", () => {
  const dag = dagStratify()(doub);
  expect(() => layeringSimplex()(dag)).toThrow(
    "simplex() doesn't work with disconnected dags"
  );
});

test("layeringSimplex() fails passing an arg to constructor", () => {
  const willFail = (layeringSimplex as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to simplex");
});
