import { createLayers, getIndex } from "../test-utils";
import {
  aggMeanFactory as meanFactory,
  aggMedianFactory as medianFactory,
  aggWeightedMedianFactory as weightedMedianFactory,
  twolayerAgg as agg,
} from "./agg";
import { twolayerOpt as opt } from "./opt";

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
  for (const [name, method] of [
    ["mean", agg().aggregator(meanFactory)],
    ["median", agg().aggregator(medianFactory)],
    ["weighted median", agg().aggregator(weightedMedianFactory)],
    ["opt", opt()],
  ] as const) {
    test(`invariants apply to ${dat.name} decrossed by ${name}`, () => {
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
