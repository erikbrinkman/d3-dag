import { layerSeparation } from ".";
import { ccoz, doub, ex, multi, oh, square, zhere } from "../../test-graphs";
import { getLayers } from "../test-utils";
import { layeringLongestPath } from "./longest-path";
import { layeringSimplex } from "./simplex";
import { layeringTopological } from "./topological";

for (const dat of [doub, ex, square, ccoz, multi, oh, zhere]) {
  for (const [name, layering] of [
    ["simplex", layeringSimplex()],
    ["longest path top down", layeringLongestPath().topDown(true)],
    ["longest path bottom up", layeringLongestPath().topDown(false)],
    ["topological", layeringTopological()],
  ] as const) {
    test(`invariants apply to ${dat.name} layered by ${name}`, () => {
      const dag = dat();

      const num = layering(dag, layerSeparation);
      expect(num).toBeGreaterThanOrEqual(0);
      const layers = getLayers(dag, num + 1);
      expect(layers.length).toBeTruthy();
    });
  }
}
