import * as d3runtime from ".";
import * as d3types from "./src";
import { createLayers, getIndex, getLayers } from "./src/sugiyama/test-utils";
import { square } from "./src/test-graphs";

// so that the runtime types align with the test utilties types
const d3dag = d3runtime as unknown as typeof d3types;

function nodeSize(): number {
  return 1;
}

describe("tests that require a built bundle", () => {
  // javascript-lp-solver
  test("decrossOpt() propogates to both layers when bundled", () => {
    // o o    o o
    //  X     | |
    // o o -> o o
    // | |    | |
    // o o    o o
    const layers = createLayers([
      [[1], [0]],
      [[0], [1]],
      [[], []],
    ]);
    d3dag.decrossOpt()(layers);
    const inds = layers.map((layer) => layer.map(getIndex));
    expect(inds).toEqual([
      [1, 0],
      [0, 1],
      [0, 1],
    ]);
  });

  // javascript-lp-solver
  test("twolayerOpt() works for very simple case", () => {
    // independent links that need to be swapped
    const [topLayer, bottomLayer] = createLayers([
      [[1], [0]],
      [[], []],
    ]);
    d3dag.twolayerOpt()(topLayer, bottomLayer, true);
    const inds = bottomLayer.map(getIndex);
    expect(inds).toEqual([1, 0]);
  });

  // javascript-lp-solver
  test("layeringSimplex() works for square", () => {
    const dag = square();
    const layering = d3dag.layeringSimplex();
    const num = layering(dag, d3dag.layerSeparation);
    const layers = getLayers(dag, num + 1);
    expect([[0], [1, 2], [3]]).toEqual(layers);
  });

  // quadprog
  test("coordQuad() works for square like layout", () => {
    const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
    const [[head], [left, right], [tail]] = layers;
    const coord = d3dag.coordQuad();
    coord(layers, d3dag.sizedSeparation(nodeSize, 0));

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
});
