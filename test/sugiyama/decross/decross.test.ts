import {
  decrossOpt,
  decrossTwoLayer,
  twolayerMean,
  twolayerMedian,
  twolayerOpt
} from "../../../src";

import { createLayers } from "../utils";

const square = () => createLayers([[[0, 1]], [[0], [0]]]);
const ccoz = () =>
  createLayers([
    [[1], [0, 3], [2]],
    [[0], [], [], [0]]
  ]);
const dtopo = () => createLayers([[[0, 1]], [[], 0], [[]], [[0]]]);
const doub = () => createLayers([[[1], [0]]]);

for (const dat of [square, ccoz, dtopo, doub]) {
  for (const method of [
    decrossOpt(),
    decrossTwoLayer().order(twolayerMean()),
    decrossTwoLayer().order(twolayerOpt()),
    decrossTwoLayer().order(twolayerMedian())
  ]) {
    test(`invariants apply to ${dat.name} decrossed by ${method.name}`, () => {
      const layered = dat();
      const before = layered.map((layer) =>
        layer.map((n) => n.data?.index).sort()
      );
      method(layered);
      const after = layered.map((layer) =>
        layer.map((n) => n.data?.index).sort()
      );
      expect(after).toEqual(before);
    });
  }
}
