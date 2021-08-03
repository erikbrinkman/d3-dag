import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { twoLayer } from "../../../src/sugiyama/decross/two-layer";
import { TwolayerOperator } from "../../../src/sugiyama/twolayer";
import { SugiNode } from "../../../src/sugiyama/utils";

const init = twoLayer();
expectAssignable<(inp: SugiNode[][]) => void>(init);

interface MyTwolayer extends TwolayerOperator<{ node: true }, { link: true }> {
  myTwoLayer: true;
}
declare const myTwolayer: MyTwolayer;
const custom = init.order(myTwolayer);
expectAssignable<(inp: SugiNode<{ node: true }, { link: true }>[][]) => void>(
  custom
);
expectNotAssignable<(inp: SugiNode[][]) => void>(custom);
expectType<MyTwolayer>(custom.order());
