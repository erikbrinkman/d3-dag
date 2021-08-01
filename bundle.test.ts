import * as d3types from "./src";
import * as d3runtime from ".";
import { createLayers, getIndex, getLayers, nodeSize } from "./test/sugiyama/utils";
import { square } from "./test/examples";

// so that the runtime types align with the test utilties types
const d3dag = d3runtime as unknown as typeof d3types;

describe("tests that require a built bundle", () => {
  // javascript=lp-solver
  test("decrossOpt() propogates to both layers when bundled", () => {
    // o o    o o
    //  X     | |
    // o o -> o o
    // | |    | |
    // o o    o o
    const layers = createLayers([
      [[1], [0]],
      [[0], [1]],
      [[], []]
    ]);
    d3dag.decrossOpt()(layers);
    const inds = layers.map((layer) => layer.map(getIndex));
    expect(inds).toEqual([
      [1, 0],
      [0, 1],
      [0, 1]
    ]);
  });

  // javascript-lp-solver
  test("twolayerOpt() works for very simple case", () => {
    // independent links that need to be swapped
    const [topLayer, bottomLayer] = createLayers([
      [[1], [0]],
      [[], []]
    ]);
    d3dag.twolayerOpt()(topLayer, bottomLayer, true);
    const inds = bottomLayer.map(getIndex);
    expect(inds).toEqual([1, 0]);
  });

  // javascript=lp-solver
  test("layeringSimplex() works for square", () => {
    const dag = square();
    d3dag.layeringSimplex()(dag);
    const layers = getLayers(dag);
    expect([[0], [1, 2], [3]]).toEqual(layers);
  });

  // quadprog
  test("coordQuad() works for square like layout", () => {
    const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
    const [[head], [left, right], [tail]] = layers;
    d3dag.coordQuad()(layers, nodeSize);

    expect(head.x).toBeCloseTo(1.0);
    expect(left.x).toBeCloseTo(0.5);
    expect(right.x).toBeCloseTo(1.5);
    expect(tail.x).toBeCloseTo(1.0);
  });

  // d3-array
  test("aggMedianFactory() gets median", () => {
    const agg = d3dag.aggMedianFactory();
    expect(agg.val()).toBeUndefined();
    agg.add(1);
    agg.add(2);
    agg.add(4);
    expect(agg.val()).toEqual(2);
  });

  // fastpriorityqueue
  test("layeringCoffmanGraham() works for square", () => {
    const dag = square();
    d3dag.layeringCoffmanGraham()(dag);
    const layers = getLayers(dag);
    expect([[0], [1, 2], [3]]).toEqual(layers);
  });

  // denque
  test("slice() works with negatives", () => {
    const dag = d3dag.dagConnect()([
      ["0", "1"],
      ["1", "2"]
    ]);
    expect(dag.size()).toBe(3);
    expect([...dag.idescendants().slice(1, -1)]).toHaveLength(1);
    expect(dag.idescendants().slice(1, -1).length).toBe(1);
  });
});
