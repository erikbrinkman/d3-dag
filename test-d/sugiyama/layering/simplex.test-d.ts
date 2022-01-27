import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import {
  GroupAccessor,
  LayeringOperator,
  RankAccessor
} from "../../../src/sugiyama/layering";
import { simplex } from "../../../src/sugiyama/layering/simplex";

const init = simplex();
expectAssignable<LayeringOperator<unknown, unknown>>(init);

interface MyRank extends RankAccessor<{ rank: number }, { link: true }> {
  myRank: true;
}
declare const myRank: MyRank;
const rank = init.rank(myRank);
expectAssignable<LayeringOperator<{ rank: number }, { link: true }>>(rank);
expectNotAssignable<LayeringOperator<unknown, unknown>>(rank);
expectType<MyRank>(rank.rank());

interface MyGroup extends GroupAccessor<{ group: string }, { info: string }> {
  myGroup: true;
}
declare const myGroup: MyGroup;
const group = rank.group(myGroup);
expectAssignable<
  LayeringOperator<
    { rank: number; group: string },
    { link: true; info: string }
  >
>(group);
expectNotAssignable<LayeringOperator<{ rank: number }, { link: true }>>(group);
expectType<MyRank>(group.rank());
expectType<MyGroup>(group.group());
