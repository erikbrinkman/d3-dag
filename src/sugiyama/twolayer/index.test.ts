import { compactCrossings, createLayers, getIndex } from "../test-utils";
import { aggMean, aggMedian, aggWeightedMedian, twolayerAgg } from "./agg";
import { twolayerGreedy } from "./greedy";
import { twolayerOpt } from "./opt";

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
const compact = () =>
  createLayers([
    [[1], [0], 2n, [3], [4]],
    [[], [], [], [], []],
  ]);

for (const dat of [square, ccoz, doub, compact]) {
  for (const [name, method] of [
    ["mean", twolayerAgg().aggregator(aggMean)],
    ["median", twolayerAgg().aggregator(aggMedian)],
    ["weighted median", twolayerAgg().aggregator(aggWeightedMedian)],
    ["swap", twolayerGreedy().scan(false)],
    ["scan", twolayerGreedy().scan(true)],
    ["opt", twolayerOpt()],
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
      expect(compactCrossings(topLayer, bottomMut)).toBeFalsy();

      // applying two layer again does not produce a new order bottom-up
      const topMut = topLayer.slice();
      method(topMut, bottomLayer, false);
      const afterTop = topMut.map(getIndex);
      method(topMut, bottomLayer, false);
      const dupTop = topMut.map(getIndex);
      expect(dupTop).toEqual(afterTop);
      expect(compactCrossings(topMut, bottomLayer)).toBeFalsy();
    });
  }
}
