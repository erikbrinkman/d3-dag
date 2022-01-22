import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { TwolayerOperator } from "../../../src/sugiyama/twolayer";
import { greedy } from "../../../src/sugiyama/twolayer/greedy";

const init = greedy();
expectAssignable<TwolayerOperator<unknown, unknown>>(init);

interface MyTwolayer
  extends TwolayerOperator<{ rank: number }, { link: true }> {
  myTwolayer: true;
}
declare const myTwolayer: MyTwolayer;
const base = init.base(myTwolayer);
expectAssignable<TwolayerOperator<{ rank: number }, { link: true }>>(base);
expectNotAssignable<TwolayerOperator<unknown, unknown>>(base);
expectType<MyTwolayer>(base.base());
