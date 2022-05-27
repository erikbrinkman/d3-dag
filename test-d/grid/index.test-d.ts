import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Graph, Rank } from "../../src/graph";
import { grid } from "../../src/grid";
import { Lane } from "../../src/grid/lane";
import { LayoutResult } from "../../src/layout";

interface Grid<N, L> {
  (inp: Graph<N, L>): LayoutResult;
}

// assign lane and narrow type
const init = grid();
expectAssignable<Grid<unknown, unknown>>(init);

interface MyLane extends Lane<{ id: string }, { num: number }> {
  myLane: true;
}
declare const myLane: MyLane;
const lane = init.lane(myLane);
expectAssignable<Grid<{ id: string }, { num: number }>>(lane);
expectNotAssignable<Grid<{ id: string }, unknown>>(lane);
expectNotAssignable<Grid<unknown, { num: number }>>(lane);
expectNotAssignable<Grid<unknown, unknown>>(lane);
expectType<MyLane>(lane.lane());

interface MyRank extends Rank<{ extra: number }, { extra: boolean }> {
  myRank: true;
}
declare const myRank: MyRank;
const rank = lane.rank(myRank);
expectAssignable<
  Grid<{ id: string; extra: number }, { num: number; extra: boolean }>
>(rank);
expectNotAssignable<Grid<{ id: string }, { num: number }>>(rank);
expectType<MyRank>(rank.rank());
