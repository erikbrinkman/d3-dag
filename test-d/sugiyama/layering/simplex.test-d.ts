import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Dag } from "../../../src/dag";
import { GroupAccessor, RankAccessor } from "../../../src/sugiyama/layering";
import { simplex } from "../../../src/sugiyama/layering/simplex";

const init = simplex();
expectAssignable<(inp: Dag) => void>(init);

interface MyRank extends RankAccessor<{ rank: number }, { link: true }> {
  myRank: true;
}
declare const myRank: MyRank;
const rank = init.rank(myRank);
expectAssignable<(inp: Dag<{ rank: number }, { link: true }>) => void>(rank);
expectNotAssignable<(inp: Dag) => void>(rank);
expectType<MyRank>(rank.rank());

interface MyGroup extends GroupAccessor<{ group: string }, { info: string }> {
  myGroup: true;
}
declare const myGroup: MyGroup;
const group = rank.group(myGroup);
expectAssignable<
  (
    inp: Dag<{ rank: number; group: string }, { link: true; info: string }>
  ) => void
>(group);
expectNotAssignable<(inp: Dag<{ rank: number }, { link: true }>) => void>(
  group
);
expectType<MyRank>(group.rank());
expectType<MyGroup>(group.group());
