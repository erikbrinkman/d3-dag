import { expect, test } from "bun:test";
import { ccoz, doub, ex, multi, oh, square, zhere } from "../../test-graphs.js";
import { layerSeparation } from "./index.js";
import { layeringLongestPath } from "./longest-path.js";
import { layeringSimplex } from "./simplex.js";
import { sizedSep } from "./test-utils.js";
import { layeringTopological } from "./topological.js";

for (const dat of [doub, ex, square, ccoz, multi, oh, zhere]) {
  for (const [name, layering] of [
    ["simplex", layeringSimplex()],
    ["longest path top down", layeringLongestPath().topDown(true)],
    ["longest path bottom up", layeringLongestPath().topDown(false)],
    ["topological", layeringTopological()],
  ] as const) {
    for (const sep of [layerSeparation, sizedSep]) {
      test(`invariants apply to ${dat.name} layered by ${name} with ${sep.name}`, () => {
        const dag = dat();

        const num = layering(dag, sep);
        expect(num).toBeGreaterThanOrEqual(0);
      });
    }
  }
}
