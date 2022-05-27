import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Graph, GraphNode } from "../../src/graph";
import { LayoutResult } from "../../src/layout";
import { sugiyama } from "../../src/sugiyama";
import { Coord } from "../../src/sugiyama/coord";
import { Decross } from "../../src/sugiyama/decross";
import { Layering } from "../../src/sugiyama/layering";

interface Sugiyama<N, L> {
  (inp: Graph<N, L>): LayoutResult;
}

// assign layering, decross, and coord slightly narrowing type each time
const init = sugiyama();
expectAssignable<Sugiyama<unknown, unknown>>(init);

interface MyLayering extends Layering<{ id: string }, unknown> {
  myLayering: true;
}
declare const myLayering: MyLayering;
const layering = init.layering(myLayering);
expectAssignable<Sugiyama<{ id: string }, unknown>>(layering);
expectNotAssignable<Sugiyama<unknown, unknown>>(layering);
expectType<MyLayering>(layering.layering());

interface MyDecross extends Decross<unknown, { edge: true }> {
  myDecross: true;
}
declare const myDecross: MyDecross;
const decross = layering.decross(myDecross);
expectAssignable<Sugiyama<{ id: string }, { edge: true }>>(decross);
expectNotAssignable<Sugiyama<{ id: string }, unknown>>(decross);
expectType<MyLayering>(decross.layering());
expectType<MyDecross>(decross.decross());

interface MyCoord extends Coord<{ extra: string }, { num: number }> {
  myCoord: true;
}
declare const myCoord: MyCoord;
const coord = decross.coord(myCoord);
expectAssignable<
  Sugiyama<{ id: string; extra: string }, { edge: true; num: number }>
>(coord);
expectNotAssignable<Sugiyama<{ id: string }, { edge: true }>>(coord);
expectType<MyLayering>(coord.layering());
expectType<MyDecross>(coord.decross());
expectType<MyCoord>(coord.coord());

// now narrow with node size to never
interface MyNodeSize {
  (node: GraphNode<null, null>): readonly [number, number];
  myNodeSize: true;
}
declare const myNodeSize: MyNodeSize;
const nodeSize = coord.nodeSize(myNodeSize);
expectAssignable<Sugiyama<never, never>>(nodeSize);
expectNotAssignable<Sugiyama<null, null>>(nodeSize);
expectNotAssignable<
  Sugiyama<{ id: string; extra: string }, { edge: true; num: number }>
>(nodeSize);
expectType<MyLayering>(nodeSize.layering());
expectType<MyDecross>(nodeSize.decross());
expectType<MyCoord>(nodeSize.coord());
expectType<MyNodeSize>(nodeSize.nodeSize());
