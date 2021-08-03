import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Dag } from "../../src/dag";
import { connect, ConnectDatum, IdOperator } from "../../src/dag/create";

// initial types
interface Init {
  [0]: string;
  [1]: string;
}

const init = connect();
expectAssignable<(inp: Init[]) => Dag<ConnectDatum, Init>>(init);
expectNotAssignable<(inp: unknown[]) => Dag<ConnectDatum, unknown>>(init);

// subtypes are preserved
interface Extra extends Init {
  extra: true;
}
declare const extraArray: Extra[];
expectType<Dag<ConnectDatum, Extra>>(init(extraArray));

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
expectAssignable<(inp: Intermediate[]) => Dag<ConnectDatum, Intermediate>>(
  targetId
);
expectNotAssignable<(inp: Init[]) => Dag<ConnectDatum, Init>>(targetId);
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
expectAssignable<(inp: Complex[]) => Dag<ConnectDatum, Complex>>(sourceId);
expectNotAssignable<(inp: Intermediate[]) => Dag<ConnectDatum, Intermediate>>(
  sourceId
);
expectType<MyTargetId>(sourceId.targetId());
expectType<MySourceId>(sourceId.sourceId());
