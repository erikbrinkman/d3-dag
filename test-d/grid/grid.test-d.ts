import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Dag } from "../../src/dag";
import { grid, GridInfo, RankOperator } from "../../src/grid";
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

interface MyRank extends RankOperator<{ extra: number }, { extra: boolean }> {
  myRank: true;
}
declare const myRank: MyRank;
const rank = lane.rank(myRank);
expectAssignable<
  (
    inp: Dag<{ id: string; extra: number }, { num: number; extra: boolean }>
  ) => GridInfo
>(rank);
expectNotAssignable<(inp: Dag<{ id: string }, { num: number }>) => GridInfo>(
  rank
);
expectType<MyRank>(rank.rank());
