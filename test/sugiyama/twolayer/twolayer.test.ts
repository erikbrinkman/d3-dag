import {
  agg,
  meanFactory,
  medianFactory,
  weightedMedianFactory,
} from "../../../src/sugiyama/twolayer/agg";
import { opt } from "../../../src/sugiyama/twolayer/opt";
import { createLayers, getIndex } from "../utils";

const square = () => createLayers([[[0, 1]], [[], []]]);
const ccoz = () =>
  createLayers([
    [[1], [0, 3], [2]],
    [[], [], [], []],
  ]);
const doub = () =>
  createLayers([
    [[1], [0]],
    [[], []],
  ]);

for (const dat of [square, ccoz, doub]) {
  for (const method of [
    agg().aggregator(meanFactory),
    agg().aggregator(medianFactory),
    agg().aggregator(weightedMedianFactory),
    opt(),
  ]) {
    test(`invariants apply to ${dat.name} decrossed by ${method.name}`, () => {
      const [topLayer, bottomLayer] = dat();

      // applying two layer again does not produce a new order
      const bottomMut = bottomLayer.slice();
      method(topLayer, bottomMut, true);
      const afterBottom = bottomMut.map(getIndex);
      method(topLayer, bottomMut, true);
      const dupBottom = bottomMut.map(getIndex);
      expect(dupBottom).toEqual(afterBottom);

      // applying two layer again does not produce a new order bottom-up
      const topMut = topLayer.slice();
      method(topMut, bottomLayer, false);
      const afterTop = topMut.map(getIndex);
      method(topMut, bottomLayer, false);
      const dupTop = topMut.map(getIndex);
      expect(dupTop).toEqual(afterTop);
    });
  }
}
