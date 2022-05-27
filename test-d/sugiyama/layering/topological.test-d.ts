import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Rank } from "../../../src/graph";
import { Layering } from "../../../src/sugiyama/layering";
import { layeringTopological } from "../../../src/sugiyama/layering/topological";

const init = layeringTopological();
expectAssignable<Layering<unknown, unknown>>(init);

interface MyRank extends Rank<{ rank: number }, { link: true }> {
  myRank: true;
}
declare const myRank: MyRank;
const rank = init.rank(myRank);
expectAssignable<Layering<{ rank: number }, { link: true }>>(rank);
expectNotAssignable<Layering<unknown, unknown>>(rank);
expectType<MyRank>(rank.rank());
