import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { MutGraph } from "../../src/graph";
import { graphConnect } from "../../src/graph/connect";
import { IdOperator } from "../../src/graph/utils";

// initial types
interface Init {
  [0]: string;
  [1]: string;
}

interface Connect<N, LD> {
  <L extends LD>(inp: L[]): MutGraph<N, L>;
}

const init = graphConnect();
expectAssignable<Connect<string, Init>>(init);
expectNotAssignable<Connect<string, unknown>>(init);

// subtypes are preserved
interface Extra extends Init {
  extra: true;
}
declare const extraArray: Extra[];
expectType<MutGraph<string, Extra>>(init(extraArray));

// link data narrows appropriately
interface MyTargetId extends IdOperator<{ target: string }> {
  target: true;
}
interface Intermediate {
  [0]: string;
  target: string;
}
declare const myTargetId: MyTargetId;
const targetId = init.targetId(myTargetId);
expectAssignable<Connect<string, Intermediate>>(targetId);
expectNotAssignable<Connect<string, Init>>(targetId);
expectType<MyTargetId>(targetId.targetId());

interface MySourceId extends IdOperator<{ source: string }> {
  source: true;
}
interface Complex {
  source: string;
  target: string;
}
declare const mySourceId: MySourceId;
const sourceId = targetId.sourceId(mySourceId);
expectAssignable<Connect<string, Complex>>(sourceId);
expectNotAssignable<Connect<string, Intermediate>>(sourceId);
expectType<MyTargetId>(sourceId.targetId());
expectType<MySourceId>(sourceId.sourceId());

interface MyDatum {
  myid: string;
  extra: true;
}
interface MyDatumAccessor {
  (id: string): MyDatum;
}
declare const myNodeDatum: MyDatumAccessor;
const nodeDatum = sourceId.nodeDatum(myNodeDatum);
expectAssignable<Connect<MyDatum, Complex>>(nodeDatum);
expectNotAssignable<Connect<string, Complex>>(nodeDatum);
expectType<MyDatumAccessor>(nodeDatum.nodeDatum());
