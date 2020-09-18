import { ccoz, doub, ex, square } from "../../examples";
import {
  layeringCoffmanGraham,
  layeringLongestPath,
  layeringSimplex,
  layeringTopological
} from "../../../src";

import { toLayers } from "../utils";

for (const dat of [doub, ex, square, ccoz]) {
  for (const method of [
    layeringSimplex(),
    layeringLongestPath(),
    layeringCoffmanGraham(),
    layeringTopological()
  ]) {
    test(`invariants apply to ${dat.name} layered by ${method.name}`, () => {
      const dag = dat();
      method(dag);
      const layers = toLayers(dag);
      expect(layers.length).toBeTruthy();
    });
  }
}
