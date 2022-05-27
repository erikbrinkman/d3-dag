import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Twolayer } from "../../../src/sugiyama/twolayer";
import { twolayerGreedy as greedy } from "../../../src/sugiyama/twolayer/greedy";

const init = greedy();
expectAssignable<Twolayer<unknown, unknown>>(init);

interface MyTwolayer extends Twolayer<{ rank: number }, { link: true }> {
  myTwolayer: true;
}
declare const myTwolayer: MyTwolayer;
const base = init.base(myTwolayer);
expectAssignable<Twolayer<{ rank: number }, { link: true }>>(base);
expectNotAssignable<Twolayer<unknown, unknown>>(base);
expectType<MyTwolayer>(base.base());
