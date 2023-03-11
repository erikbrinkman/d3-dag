import { createLayers, getIndex } from "../test-utils";
import { decrossDfs } from "./dfs";

test("decrossDfs() works on trivial case", () => {
  // o o    o o
  //  X  -> | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  const decross = decrossDfs();
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [1, 0],
    [0, 1],
  ]);
});

test("decrossDfs() works on compact trivial case", () => {
  // o
  //  \
  // o |
  //  /
  // o
  const layers = createLayers([[0n], [[1]], [0n, 1], [[], 0], [0n], [[]]]);
  const decross = decrossDfs();
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [0], [null, 0], [null, 0], [0], [0]]);
});

test("decrossDfs() works on trivial case bottom up", () => {
  // o o    o o
  //  X  -> | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  const decross = decrossDfs().topDown(false);
  expect(decross.topDown()).toBe(false);
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
  ]);
});

test("decrossDfs() fails passing an arg to constructor", () => {
  expect(() => decrossDfs(null as never)).toThrow(
    "got arguments to decrossDfs"
  );
});
