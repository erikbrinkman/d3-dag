import { connect, hierarchy, stratify } from "../../src/dag/create";
import { sugify } from "../../src/sugiyama/utils";
import { dummy } from "../examples";
import { createLayers, crossings, getLayers } from "./utils";

test("sugify() works with dummy nodes", () => {
  const dag = dummy().depth();
  const layers = sugify(dag);
  const sizes = layers.map((layer) => layer.length);
  expect(sizes).toEqual([1, 2, 1]);
});

test("sugify() throws for undefined id", () => {
  const dag = hierarchy()({ children: undefined });
  expect(() => sugify(dag)).toThrow(
    "did not get a defined value during layering"
  );
});

test("sugify() throws for negative id", () => {
  const dag = hierarchy()({ children: undefined });
  for (const node of dag) {
    node.value = -1;
  }
  expect(() => sugify(dag)).toThrow(
    "got an invalid (negative) value during layering: -1"
  );
});

test("sugify() throws for layering without 0", () => {
  const dag = hierarchy()({ children: undefined });
  for (const node of dag) {
    node.value = 1;
  }
  expect(() => sugify(dag)).toThrow("no nodes were assigned to layer 0");
});

test("sugify() throws for flat layering", () => {
  const dag = connect()([["a", "b"]]);
  for (const node of dag) {
    node.value = 0;
  }
  expect(() => sugify(dag)).toThrow("greater or equal layer to parent data");
});

test("getLayers() throws when not all nodes have a layer", () => {
  const dag = stratify()([
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
    node.value = node.data.layer;
  }
  expect(() => getLayers(dag)).toThrow();
});

test("createLayers() return the right number of nodes", () => {
  const result = createLayers([
    [[0], [0, 2], [1]],
    [[1], 1, [1, 2]],
    [[1], [0], [0]],
    [[], []]
  ]);
  const lengths = result.map((layer) => layer.length);
  expect(lengths).toEqual([3, 3, 3, 2]);
});

test("createLayers() throws on empty", () => {
  expect(() => createLayers([])).toThrow();
});

test("createLayers() throws on invalid last row", () => {
  expect(() => createLayers([[[1]]])).toThrow();
});

test("createLayers() throws on out of range", () => {
  expect(() => createLayers([[[1]], [[]]])).toThrow();
});

test("getLayers() throws with empty layer", () => {
  const dag = stratify()([
    {
      id: "a",
      layer: 1
    }
  ]);
  for (const node of dag) {
    node.value = node.data.layer;
  }
  expect(() => getLayers(dag)).toThrow("layer 0 was empty");
});

test("crossings() returns correctly for simple case", () => {
  const layers = createLayers([
    [[0], [1]],
    [[], []]
  ]);
  expect(crossings(layers)).toBeCloseTo(0);
});

test("crossings() returns correctly for simple case with crossings", () => {
  const layers = createLayers([
    [[1], [0]],
    [[], []]
  ]);
  expect(crossings(layers)).toBeCloseTo(1);
});

test("crossings() returns correctly for complex case", () => {
  const layers = createLayers([
    [[1], [1], [0, 1], [1], [0]],
    [[], []]
  ]);
  expect(crossings(layers)).toBeCloseTo(6);
});

test("crossings() is correct with multiple layers", () => {
  const layers = createLayers([
    [[1], [0]],
    [1, 0],
    [[], []]
  ]);
  expect(crossings(layers)).toBeCloseTo(2);
});
