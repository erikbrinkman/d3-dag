import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Decross } from "../../../src/sugiyama/decross";
import { decrossTwoLayer as twoLayer } from "../../../src/sugiyama/decross/two-layer";
import { Twolayer } from "../../../src/sugiyama/twolayer";

const init = twoLayer();
expectAssignable<Decross<unknown, unknown>>(init);

interface MyTwolayer extends Twolayer<{ node: true }, { link: true }> {
  myTwoLayer: true;
}
declare const myTwolayer: MyTwolayer;
const custom = init.order(myTwolayer);
expectAssignable<Decross<{ node: true }, { link: true }>>(custom);
expectNotAssignable<Decross<unknown, unknown>>(custom);
expectType<MyTwolayer>(custom.order());

interface MyInitA extends Decross<{ val: number }, unknown> {
  myInitA: true;
}
interface MyInitB extends Decross<unknown, { val: number }> {
  myInitB: true;
}
declare const myInits: [MyInitA, MyInitB];
const inits = custom.inits(myInits);
expectAssignable<
  Decross<{ node: true; val: number }, { link: true; val: number }>
>(inits);
expectNotAssignable<Decross<{ node: true }, { link: true }>>(inits);
expectType<[MyInitA, MyInitB]>(inits.inits());
