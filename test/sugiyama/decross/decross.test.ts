import { createLayers } from "../utils";
import { opt as decrossOpt } from "../../../src/sugiyama/decross/opt";
import { getIndex } from "../utils";
import { mean } from "../../../src/sugiyama/twolayer/mean";
import { median } from "../../../src/sugiyama/twolayer/median";
import { twoLayer } from "../../../src/sugiyama/decross/two-layer";
import { opt as twolayerOpt } from "../../../src/sugiyama/twolayer/opt";

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
    twoLayer().order(mean()),
    twoLayer().order(median()),
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
