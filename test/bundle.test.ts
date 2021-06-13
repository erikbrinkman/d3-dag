import * as d3types from "../src";

import { createLayers, getIndex, getLayers, nodeSize } from "./sugiyama/utils";

import { square } from "./examples";

// NOTE these are skipped bceause they require a built bundle
// eslint-disable-next-line jest/no-disabled-tests
describe.skip("tests that require a built bundle", () => {
  async function load(): Promise<typeof d3types> {
    // NOTE as string prevents compile time check of path
    const mod = await import(".." as string);
    return mod as unknown as typeof d3types;
  }

  // javascript=lp-solver
  test("decrossOpt() propogates to both layers when bundled", async () => {
    const d3dag = await load();
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
  test("twolayerOpt() works for very simple case", async () => {
    const d3dag = await load();
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
  test("layeringSimplex() works for square", async () => {
    const d3dag = await load();
    const dag = square();
    d3dag.layeringSimplex()(dag);
    const layers = getLayers(dag);
    expect([[0], [1, 2], [3]]).toEqual(layers);
  });

  // quadprog
  test("coordQuad() works for square like layout", async () => {
    const d3dag = await load();
    const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
    const [[head], [left, right], [tail]] = layers;
    d3dag.coordQuad()(layers, nodeSize);

    expect(head.x).toBeCloseTo(1.0);
    expect(left.x).toBeCloseTo(0.5);
    expect(right.x).toBeCloseTo(1.5);
    expect(tail.x).toBeCloseTo(1.0);
  });

  // d3-array
  test("twolayerMedian() works for very simple case", async () => {
    const d3dag = await load();
    // independent links that need to be swapped
    const [topLayer, bottomLayer] = createLayers([
      [[1], [0]],
      [[], []]
    ]);
    d3dag.twolayerMedian()(topLayer, bottomLayer, true);
    const inds = bottomLayer.map(getIndex);
    expect(inds).toEqual([1, 0]);
  });

  // fastpriorityqueue
  test("layeringCoffmanGraham() works for square", async () => {
    const d3dag = await load();
    const dag = square();
    d3dag.layeringCoffmanGraham()(dag);
    const layers = getLayers(dag);
    expect([[0], [1, 2], [3]]).toEqual(layers);
  });

  // denque
  test("slice() works with negatives", async () => {
    const d3dag = await load();
    const dag = d3dag.dagConnect()([
      ["0", "1"],
      ["1", "2"]
    ]);
    expect(dag.size()).toBe(3);
    expect([...dag.idescendants().slice(1, -1)]).toHaveLength(1);
    expect(dag.idescendants().slice(1, -1).length).toBe(1);
  });
});
