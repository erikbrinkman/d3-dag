import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { DecrossOperator } from "../../../src/sugiyama/decross";
import { twoLayer } from "../../../src/sugiyama/decross/two-layer";
import { TwolayerOperator } from "../../../src/sugiyama/twolayer";

const init = twoLayer();
expectAssignable<DecrossOperator<unknown, unknown>>(init);

interface MyTwolayer extends TwolayerOperator<{ node: true }, { link: true }> {
  myTwoLayer: true;
}
declare const myTwolayer: MyTwolayer;
const custom = init.order(myTwolayer);
expectAssignable<DecrossOperator<{ node: true }, { link: true }>>(custom);
expectNotAssignable<DecrossOperator<unknown, unknown>>(custom);
expectType<MyTwolayer>(custom.order());

interface MyInitA extends DecrossOperator<{ val: number }, unknown> {
  myInitA: true;
}
interface MyInitB extends DecrossOperator<unknown, { val: number }> {
  myInitB: true;
}
declare const myInits: [MyInitA, MyInitB];
const inits = custom.inits(myInits);
expectAssignable<
  DecrossOperator<{ node: true; val: number }, { link: true; val: number }>
>(inits);
expectNotAssignable<DecrossOperator<{ node: true }, { link: true }>>(inits);
expectType<[MyInitA, MyInitB]>(inits.inits());
