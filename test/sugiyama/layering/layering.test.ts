import { coffmanGraham } from "../../../src/sugiyama/layering/coffman-graham";
import { longestPath } from "../../../src/sugiyama/layering/longest-path";
import { simplex } from "../../../src/sugiyama/layering/simplex";
import { topological } from "../../../src/sugiyama/layering/topological";
import { ccoz, doub, ex, multi, square } from "../../examples";
import { getLayers } from "../utils";

for (const dat of [doub, ex, square, ccoz, multi]) {
  for (const method of [
    simplex(),
    longestPath(),
    coffmanGraham(),
    topological()
  ]) {
    test(`invariants apply to ${dat.name} layered by ${method.name}`, () => {
      const dag = dat();
      method(dag);
      const layers = getLayers(dag);
      expect(layers.length).toBeTruthy();
    });
  }
}
