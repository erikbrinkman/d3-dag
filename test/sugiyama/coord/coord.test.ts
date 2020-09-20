import {
  coordCenter,
  coordGreedy,
  coordMinCurve,
  coordQuad
} from "../../../src";
import { createLayers, sep } from "../utils";

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

for (const dat of [square, ccoz, dtopo, doub, vee, ex]) {
  for (const method of [
    coordCenter(),
    coordGreedy(),
    coordMinCurve(),
    coordQuad()
  ]) {
    test(`invariants apply to ${dat.name} assigned by ${method.name}`, () => {
      const layered = dat();
      method(layered, sep);
      for (const layer of layered) {
        for (const node of layer) {
          expect(node.x).toBeGreaterThanOrEqual(0);
          expect(node.x).toBeLessThanOrEqual(1);
        }
      }
    });

    test(`zero separation works for ${dat.name} assigned by ${method.name}`, () => {
      const layered = dat();
      method(layered, () => 0);
      for (const layer of layered) {
        for (const node of layer) {
          expect(node.x).toBeCloseTo(0.5);
        }
      }
    });
  }
}
