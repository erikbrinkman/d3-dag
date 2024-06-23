import { expect, test } from "bun:test";
import { bigrams } from "../../iters";
import { compactCrossings, createLayers, getIndex } from "../test-utils";
import { twolayerAgg } from "../twolayer/agg";
import { twolayerOpt } from "../twolayer/opt";
import { decrossDfs } from "./dfs";
import { decrossOpt } from "./opt";
import { decrossTwoLayer } from "./two-layer";

const square = () => createLayers([[[0, 1]], [[0], [0]], [[]]]);
const ccoz = () => createLayers([[[1], [0, 3], [2]], [[0], [], [], [0]], [[]]]);
const dtopo = () => createLayers([[[0, 1]], [[], 0], [[]], [[0]], [[]]]);
const doub = () =>
  createLayers([
    [[1], [0]],
    [[], []],
  ]);
const sizedLine = () => createLayers([[0n], [[0]], [0n], [[]]]);

for (const dat of [square, ccoz, dtopo, doub, sizedLine]) {
  for (const [name, method] of [
    ["two layer agg", decrossTwoLayer().order(twolayerAgg())],
    ["two layer opt", decrossTwoLayer().order(twolayerOpt())],
    ["opt", decrossOpt()],
    ["dfs top down", decrossDfs().topDown(true)],
    ["dfs bottom up", decrossDfs().topDown(false)],
  ] as const) {
    test(`invariants apply to ${dat.name} decrossed by ${name}`, () => {
      const layered = dat();
      const before = layered.map((layer) => layer.map(getIndex).sort());
      method(layered);
      const after = layered.map((layer) => layer.map(getIndex).sort());
      expect(after).toEqual(before);

      for (const [topLayer, bottomLayer] of bigrams(layered)) {
        expect(compactCrossings(topLayer, bottomLayer)).toBeFalsy();
      }
    });
  }
}
