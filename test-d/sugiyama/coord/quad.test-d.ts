import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { GraphLink, GraphNode } from "../../../src/graph";
import { Coord } from "../../../src/sugiyama/coord";
import { coordQuad as quad } from "../../../src/sugiyama/coord/quad";

const init = quad();
expectAssignable<Coord<unknown, unknown>>(init);

interface MyVertWeak {
  (inp: GraphLink<{ rank: number }, { link: true }>): number;
  myVertWeak: true;
}
declare const myVertWeak: MyVertWeak;
const vertWeak = init.vertWeak(myVertWeak);
expectAssignable<Coord<{ rank: number }, { link: true }>>(vertWeak);
expectNotAssignable<Coord<unknown, unknown>>(vertWeak);
expectType<MyVertWeak>(vertWeak.vertWeak());

interface MyLinkCurve {
  (inp: GraphLink<{ curve: string }, unknown>): number;
  myLinkCurve: true;
}
declare const myLinkCurve: MyLinkCurve;
const linkCurve = vertWeak.linkCurve(myLinkCurve);
expectAssignable<Coord<{ rank: number; curve: string }, { link: true }>>(
  linkCurve
);
expectNotAssignable<Coord<{ rank: number }, { link: true }>>(linkCurve);
expectType<MyLinkCurve>(linkCurve.linkCurve());

interface MyNodeCurve {
  (inp: GraphNode<unknown, { index: number }>): number;
  myNodeCurve: true;
}
declare const myNodeCurve: MyNodeCurve;
const nodeCurve = linkCurve.nodeCurve(myNodeCurve);
expectAssignable<
  Coord<{ rank: number; curve: string }, { link: true; index: number }>
>(nodeCurve);
expectNotAssignable<Coord<{ rank: number; curve: string }, { link: true }>>(
  nodeCurve
);
expectType<MyNodeCurve>(nodeCurve.nodeCurve());

interface MyVertStrong {
  (inp: GraphLink<{ strong: true }, { tag: string }>): number;
  myVertStrong: true;
}
declare const myVertStrong: MyVertStrong;
const vertStrong = nodeCurve.vertStrong(myVertStrong);
expectAssignable<
  Coord<
    { rank: number; curve: string; strong: true },
    { link: true; index: number; tag: string }
  >
>(vertStrong);
expectNotAssignable<
  Coord<{ rank: number; curve: string }, { link: true; index: number }>
>(vertStrong);
expectType<MyVertStrong>(vertStrong.vertStrong());

interface MyNodeCurveRep {
  (inp: GraphNode<{ index: number }, unknown>): number;
  myNodeCurveRep: true;
}
declare const myNodeCurveRep: MyNodeCurveRep;
const nodeCurveRep = vertStrong.nodeCurve(myNodeCurveRep);
expectAssignable<
  Coord<
    { rank: number; curve: string; index: number; strong: true },
    { link: true; tag: string }
  >
>(nodeCurveRep);
expectNotAssignable<
  Coord<
    { rank: number; curve: string; strong: true },
    { link: true; index: number; tag: string }
  >
>(nodeCurveRep);
expectType<MyNodeCurveRep>(nodeCurveRep.nodeCurve());
