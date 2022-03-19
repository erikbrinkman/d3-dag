import { dfs } from "../../../src/sugiyama/decross/dfs";
import { createLayers, getIndex } from "../utils";

test("dfs() works on trivial case", () => {
  // o o    o o
  //  X  -> | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[], []]
  ]);
  const decross = dfs();
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [1, 0],
    [0, 1]
  ]);
});

test("dfs() works on trivial case bottom up", () => {
  // o o    o o
  //  X  -> | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[], []]
  ]);
  const decross = dfs().topDown(false);
  expect(decross.topDown()).toBe(false);
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [0, 1],
    [1, 0]
  ]);
});

test("dfs() fails passing an arg to constructor", () => {
  expect(() => dfs(null as never)).toThrow("got arguments to dfs");
});
