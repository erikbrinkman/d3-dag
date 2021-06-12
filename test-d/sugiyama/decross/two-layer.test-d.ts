import { expectAssignable, expectNotAssignable, expectType } from "tsd";

import { SugiNode } from "../../../src/sugiyama/utils";
import { TwolayerOperator } from "../../../src/sugiyama/twolayer";
import { twoLayer } from "../../../src/sugiyama/decross/two-layer";

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
