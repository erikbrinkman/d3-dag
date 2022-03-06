import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { CoordOperator } from "../../../src/sugiyama/coord";
import { simplex, WeightAccessor } from "../../../src/sugiyama/coord/simplex";

const init = simplex();
expectAssignable<CoordOperator<unknown, unknown>>(init);

interface MyWeight extends WeightAccessor<{ rank: number }, { link: true }> {
  myWeight: true;
}
declare const myWeight: MyWeight;
const weight = init.weight(myWeight);
expectAssignable<CoordOperator<{ rank: number }, { link: true }>>(weight);
expectNotAssignable<CoordOperator<unknown, unknown>>(weight);
expectType<MyWeight>(weight.weight());
