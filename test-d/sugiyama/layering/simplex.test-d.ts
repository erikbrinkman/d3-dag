import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Rank } from "../../../src/graph";
import { Group, Layering } from "../../../src/sugiyama/layering";
import { layeringSimplex as simplex } from "../../../src/sugiyama/layering/simplex";

const init = simplex();
expectAssignable<Layering<unknown, unknown>>(init);

interface MyRank extends Rank<{ rank: number }, { link: true }> {
  myRank: true;
}
declare const myRank: MyRank;
const rank = init.rank(myRank);
expectAssignable<Layering<{ rank: number }, { link: true }>>(rank);
expectNotAssignable<Layering<unknown, unknown>>(rank);
expectType<MyRank>(rank.rank());

interface MyGroup extends Group<{ group: string }, { info: string }> {
  myGroup: true;
}
declare const myGroup: MyGroup;
const group = rank.group(myGroup);
expectAssignable<
  Layering<{ rank: number; group: string }, { link: true; info: string }>
>(group);
expectNotAssignable<Layering<{ rank: number }, { link: true }>>(group);
expectType<MyRank>(group.rank());
expectType<MyGroup>(group.group());
