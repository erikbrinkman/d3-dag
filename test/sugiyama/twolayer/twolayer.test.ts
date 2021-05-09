import { twolayerMean, twolayerMedian, twolayerOpt } from "../../../src";

import { createLayers } from "../utils";

const square = () => createLayers([[[0, 1]]]);
const ccoz = () => createLayers([[[1], [0, 3], [2]]]);
const doub = () => createLayers([[[1], [0]]]);

for (const dat of [square, ccoz, doub]) {
  for (const method of [twolayerMean(), twolayerMedian(), twolayerOpt()]) {
    test(`invariants apply to ${dat.name} decrossed by ${method.name}`, () => {
      const [topLayer, bottomLayer] = dat();

      // applying two layer again does not produce a new order
      const bottomMut = bottomLayer.slice();
      method(topLayer, bottomMut, true);
      const afterBottom = bottomMut.map((n) => n.data?.index);
      method(topLayer, bottomMut, true);
      const dupBottom = bottomMut.map((n) => n.data?.index);
      expect(dupBottom).toEqual(afterBottom);

      // applying two layer again does not produce a new order bottom-up
      const topMut = topLayer.slice();
      method(topMut, bottomLayer, false);
      const afterTop = topMut.map((n) => n.data?.index);
      method(topMut, bottomLayer, false);
      const dupTop = topMut.map((n) => n.data?.index);
      expect(dupTop).toEqual(afterTop);
    });
  }
}
