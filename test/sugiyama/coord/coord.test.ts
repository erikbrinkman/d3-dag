import {
  coordCenter,
  coordGreedy,
  coordMinCurve,
  coordQuad
} from "../../../src";
import { createLayers, nodeSize } from "../utils";

import { DagNode } from "../../../src/dag/node";

const square = () =>
  createLayers([
    [[0], [1]],
    [[0], [0]]
  ]);
const ccoz = () =>
  createLayers([
    [[0, 1], [2], [3]],
    [[0], [0], [], []]
  ]);
const dtopo = () => createLayers([[[0, 1]], [[], 0], [[]], [[0]]]);
const doub = () => createLayers([[[0], []]]);
const vee = () => createLayers([[[0], [0]]]);
const ex = () => createLayers([[[1], [0]]]);

function idLayerSize(node: DagNode): [number, number] {
  const [, col] = node.id.split(",");
  const size = parseInt(col) + 1;
  return [size, 1];
}

for (const method of [
  coordCenter(),
  coordGreedy(),
  coordMinCurve(),
  coordQuad()
]) {
  for (const dat of [square, ccoz, dtopo, doub, vee, ex]) {
    test(`invariants apply to ${dat.name} assigned by ${method.name}`, () => {
      const layered = dat();
      const width = method(layered, nodeSize);
      for (const layer of layered) {
        for (const node of layer) {
          expect(node.x).toBeGreaterThanOrEqual(0);
          expect(node.x).toBeLessThanOrEqual(width);
        }
      }
    });
  }

  test(`single layer respects node width by ${method.name}`, () => {
    // NOTE due to design of createLayers, have to throw out top layer
    const [, layer] = createLayers([[[0, 1, 2]]]);
    const width = method([layer], idLayerSize);
    expect(width).toBeCloseTo(6);
    const [first, second, third] = layer;
    expect(first.x).toBeCloseTo(0.5);
    expect(second.x).toBeCloseTo(2);
    expect(third.x).toBeCloseTo(4.5);
  });
}
