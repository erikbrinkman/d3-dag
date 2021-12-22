import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Dag } from "../../src/dag";
import { grid, GridInfo } from "../../src/grid";
import { LaneOperator } from "../../src/grid/lane";

// assign lane and narrow type
const init = grid();
expectAssignable<(inp: Dag) => GridInfo>(init);

interface MyLane extends LaneOperator<{ id: string }, { num: number }> {
  myLane: true;
}
declare const myLane: MyLane;
const lane = init.lane(myLane);
expectAssignable<(inp: Dag<{ id: string }, { num: number }>) => GridInfo>(lane);
expectNotAssignable<(inp: Dag<{ id: string }>) => GridInfo>(lane);
expectNotAssignable<(inp: Dag<unknown, { num: number }>) => GridInfo>(lane);
expectNotAssignable<(inp: Dag) => GridInfo>(lane);
expectType<MyLane>(lane.lane());
