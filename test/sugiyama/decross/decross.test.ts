import { opt as decrossOpt } from "../../../src/sugiyama/decross/opt";
import { twoLayer } from "../../../src/sugiyama/decross/two-layer";
import { agg } from "../../../src/sugiyama/twolayer/agg";
import { opt as twolayerOpt } from "../../../src/sugiyama/twolayer/opt";
import { createLayers, getIndex } from "../utils";

const square = () => createLayers([[[0, 1]], [[0], [0]], [[]]]);
const ccoz = () => createLayers([[[1], [0, 3], [2]], [[0], [], [], [0]], [[]]]);
const dtopo = () => createLayers([[[0, 1]], [[], 0], [[]], [[0]], [[]]]);
const doub = () =>
  createLayers([
    [[1], [0]],
    [[], []]
  ]);

for (const dat of [square, ccoz, dtopo, doub]) {
  for (const method of [
    twoLayer().order(agg()),
    twoLayer().order(twolayerOpt()),
    decrossOpt()
  ]) {
    test(`invariants apply to ${dat.name} decrossed by ${method.name}`, () => {
      const layered = dat();
      const before = layered.map((layer) => layer.map(getIndex).sort());
      method(layered);
      const after = layered.map((layer) => layer.map(getIndex).sort());
      expect(after).toEqual(before);
    });
  }
}
