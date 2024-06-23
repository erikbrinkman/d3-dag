import { expect, test } from "bun:test";
import { ccoz, doub, ex, multi, oh, square, zhere } from "../../test-graphs";
import { laneGreedy } from "./greedy";
import { laneOpt } from "./opt";
import { verifyLanes } from "./utils";

for (const dat of [doub, ex, square, ccoz, multi, oh, zhere]) {
  for (const [name, lane] of [
    ["opt", laneOpt().compressed(false).dist(false)],
    ["opt comp dist", laneOpt().compressed(true).dist(true)],
    [
      "greedy down",
      laneGreedy().topDown(true).compressed(false).bidirectional(false),
    ],
    [
      "greedy down both",
      laneGreedy().topDown(true).compressed(true).bidirectional(true),
    ],
    [
      "greedy up",
      laneGreedy().topDown(false).compressed(false).bidirectional(false),
    ],
    [
      "greedy up both",
      laneGreedy().topDown(false).compressed(true).bidirectional(true),
    ],
  ] as const) {
    test(`invariants apply to ${dat.name} with lane ${name}`, () => {
      const dag = dat();
      const nodes = dag.topological();
      for (const [y, node] of nodes.entries()) {
        node.y = y;
      }
      lane(nodes);
      const uniq = verifyLanes(nodes, lane);
      expect(uniq).toBeGreaterThan(0);
    });
  }
}
