import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { CoordOperator } from "../../../src/sugiyama/coord";
import {
  LinkWeightAccessor,
  NodeWeightAccessor,
  quad,
} from "../../../src/sugiyama/coord/quad";

const init = quad();
expectAssignable<CoordOperator<unknown, unknown>>(init);
expectType<[number, number]>(init.vertical());
expectType<[number, number]>(init.curve());

interface MyVertWeak
  extends LinkWeightAccessor<{ rank: number }, { link: true }> {
  myVertWeak: true;
}
declare const myVertWeak: MyVertWeak;
const vertWeak = init.vertWeak(myVertWeak);
expectAssignable<CoordOperator<{ rank: number }, { link: true }>>(vertWeak);
expectNotAssignable<CoordOperator<unknown, unknown>>(vertWeak);
expectType<MyVertWeak>(vertWeak.vertWeak());
expectType<null>(vertWeak.vertical());

interface MyLinkCurve extends LinkWeightAccessor<{ curve: string }, unknown> {
  myLinkCurve: true;
}
declare const myLinkCurve: MyLinkCurve;
const linkCurve = vertWeak.linkCurve(myLinkCurve);
expectAssignable<
  CoordOperator<{ rank: number; curve: string }, { link: true }>
>(linkCurve);
expectNotAssignable<CoordOperator<{ rank: number }, { link: true }>>(linkCurve);
expectType<MyLinkCurve>(linkCurve.linkCurve());
expectType<null>(linkCurve.curve());

interface MyNodeCurve extends NodeWeightAccessor<unknown, { index: number }> {
  myNodeCurve: true;
}
declare const myNodeCurve: MyNodeCurve;
const nodeCurve = linkCurve.nodeCurve(myNodeCurve);
expectAssignable<
  CoordOperator<{ rank: number; curve: string }, { link: true; index: number }>
>(nodeCurve);
expectNotAssignable<
  CoordOperator<{ rank: number; curve: string }, { link: true }>
>(nodeCurve);
expectType<MyNodeCurve>(nodeCurve.nodeCurve());

interface MyVertStrong
  extends LinkWeightAccessor<{ strong: true }, { tag: string }> {
  myVertStrong: true;
}
declare const myVertStrong: MyVertStrong;
const vertStrong = nodeCurve.vertStrong(myVertStrong);
expectAssignable<
  CoordOperator<
    { rank: number; curve: string; strong: true },
    { link: true; index: number; tag: string }
  >
>(vertStrong);
expectNotAssignable<
  CoordOperator<{ rank: number; curve: string }, { link: true; index: number }>
>(vertStrong);
expectType<MyVertStrong>(vertStrong.vertStrong());

interface MyNodeCurveRep
  extends NodeWeightAccessor<{ index: number }, unknown> {
  myNodeCurveRep: true;
}
declare const myNodeCurveRep: MyNodeCurveRep;
const nodeCurveRep = vertStrong.nodeCurve(myNodeCurveRep);
expectAssignable<
  CoordOperator<
    { rank: number; curve: string; index: number; strong: true },
    { link: true; tag: string }
  >
>(nodeCurveRep);
expectNotAssignable<
  CoordOperator<
    { rank: number; curve: string; strong: true },
    { link: true; index: number; tag: string }
  >
>(nodeCurveRep);
expectType<MyNodeCurveRep>(nodeCurveRep.nodeCurve());
