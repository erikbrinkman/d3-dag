import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { GraphLink } from "../../../src/graph";
import { Coord } from "../../../src/sugiyama/coord";
import { coordSimplex } from "../../../src/sugiyama/coord/simplex";

const init = coordSimplex();
expectAssignable<Coord<unknown, unknown>>(init);

interface MyWeight {
  (inp: GraphLink<{ rank: number }, { link: true }>): [number, number, number];
  myWeight: true;
}
declare const myWeight: MyWeight;
const weight = init.weight(myWeight);
expectAssignable<Coord<{ rank: number }, { link: true }>>(weight);
expectNotAssignable<Coord<unknown, unknown>>(weight);
expectType<MyWeight>(weight.weight());
