import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Dag } from "../../src/dag";
import {
  NodeSizeAccessor,
  SugiNodeSizeAccessor,
  sugiyama,
  SugiyamaInfo,
} from "../../src/sugiyama";
import { CoordOperator } from "../../src/sugiyama/coord";
import { DecrossOperator } from "../../src/sugiyama/decross";
import { LayeringOperator } from "../../src/sugiyama/layering";

// assign layering, decross, and coord slightly narrowing type each time
const init = sugiyama();
expectAssignable<(inp: Dag) => SugiyamaInfo>(init);

interface MyLayering extends LayeringOperator<{ id: string }, unknown> {
  myLayering: true;
}
declare const myLayering: MyLayering;
const layering = init.layering(myLayering);
expectAssignable<(inp: Dag<{ id: string }>) => SugiyamaInfo>(layering);
expectNotAssignable<(inp: Dag) => SugiyamaInfo>(layering);
expectType<MyLayering>(layering.layering());

interface MyDecross extends DecrossOperator<unknown, { edge: true }> {
  myDecross: true;
}
declare const myDecross: MyDecross;
const decross = layering.decross(myDecross);
expectAssignable<(inp: Dag<{ id: string }, { edge: true }>) => SugiyamaInfo>(
  decross
);
expectNotAssignable<(inp: Dag<{ id: string }>) => SugiyamaInfo>(decross);
expectType<MyLayering>(decross.layering());
expectType<MyDecross>(decross.decross());

interface MyCoord extends CoordOperator<{ extra: string }, { num: number }> {
  myCoord: true;
}
declare const myCoord: MyCoord;
const coord = decross.coord(myCoord);
expectAssignable<
  (
    inp: Dag<{ id: string; extra: string }, { edge: true; num: number }>
  ) => SugiyamaInfo
>(coord);
expectNotAssignable<(inp: Dag<{ id: string }, { edge: true }>) => SugiyamaInfo>(
  coord
);
expectType<MyLayering>(coord.layering());
expectType<MyDecross>(coord.decross());
expectType<MyCoord>(coord.coord());

// now narrow with node size to never
interface MyNodeSize extends NodeSizeAccessor<null, null> {
  myNodeSize: true;
}
declare const myNodeSize: MyNodeSize;
const nodeSize = coord.nodeSize(myNodeSize);
expectAssignable<(inp: Dag<never, never>) => SugiyamaInfo>(nodeSize);
expectNotAssignable<(inp: Dag<null, null>) => SugiyamaInfo>(nodeSize);
expectNotAssignable<
  (
    inp: Dag<{ id: string; extra: string }, { edge: true; num: number }>
  ) => SugiyamaInfo
>(nodeSize);
expectType<MyLayering>(nodeSize.layering());
expectType<MyDecross>(nodeSize.decross());
expectType<MyCoord>(nodeSize.coord());
expectType<MyNodeSize>(nodeSize.nodeSize());
expectType<MyNodeSize>(nodeSize.sugiNodeSize().wrapped);

// now expand with compatible type
interface MySugiNodeSize extends SugiNodeSizeAccessor<{ sugi: true }, unknown> {
  mySugiNodeSize: true;
}
declare const mySugiNodeSize: MySugiNodeSize;
const sugiNodeSize = nodeSize.sugiNodeSize(mySugiNodeSize);
expectAssignable<
  (
    inp: Dag<
      { id: string; extra: string; sugi: true },
      { edge: true; num: number }
    >
  ) => SugiyamaInfo
>(sugiNodeSize);
expectNotAssignable<
  (
    inp: Dag<{ id: string; extra: string }, { edge: true; num: number }>
  ) => SugiyamaInfo
>(sugiNodeSize);
expectType<MyLayering>(sugiNodeSize.layering());
expectType<MyDecross>(sugiNodeSize.decross());
expectType<MyCoord>(sugiNodeSize.coord());
expectType<null>(sugiNodeSize.nodeSize());
expectType<MySugiNodeSize>(sugiNodeSize.sugiNodeSize());
