import { createLayers, crossings, toLayers } from "./utils";

import { dagStratify } from "../../src";

interface Layered {
  id: string;
  parentIds?: string[];
  layer?: number;
}

test("toLayers() throws when not all nodes have a layer", () => {
  const dag = dagStratify<Layered>()([
    {
      id: "a",
      layer: 0
    },
    {
      id: "b",
      parentIds: ["a"]
    }
  ]);
  for (const node of dag) {
    (node as { layer?: number }).layer = node.data.layer;
  }
  expect(() => toLayers(dag)).toThrow("node with id b was not given a layer");
});

test("createLayers() return the right number of nodes", () => {
  const result = createLayers([
    [[0], [0, 2], [1]],
    [[1], 1, [1, 2]],
    [[1], [0], [0]]
  ]);
  const lengths = result.map((layer) => layer.length);
  expect(lengths).toEqual([3, 3, 3, 2]);
});

test("createLayers() throws on empty", () => {
  expect(() => createLayers([])).toThrow(
    "must pass at least one layer of children"
  );
});

test("createLayers() throws on unfinished last layer", () => {
  expect(() => createLayers([[[0], [2]]])).toThrow(
    "child ids must be ascending from zero"
  );
});

test("createLayers() throws on out of range", () => {
  expect(() =>
    createLayers([
      [[0], [2]],
      [[1], [0]]
    ])
  ).toThrow("each child id must correspond to a node in the next layer");
});

test("crossings() returns correctly for simple case", () => {
  const layers = createLayers([[[0], [1]]]);
  expect(crossings(layers)).toBeCloseTo(0);
});

test("crossings() returns correctly for simple case with crossings", () => {
  const layers = createLayers([[[1], [0]]]);
  expect(crossings(layers)).toBeCloseTo(1);
});

test("crossings() returns correctly for complex case", () => {
  const layers = createLayers([[[1], [1], [0, 1], [1], [0]]]);
  expect(crossings(layers)).toBeCloseTo(6);
});

test("crossings() is correct with multiple layers", () => {
  const layers = createLayers([
    [1, 0],
    [1, 0]
  ]);
  expect(crossings(layers)).toBeCloseTo(2);
});
