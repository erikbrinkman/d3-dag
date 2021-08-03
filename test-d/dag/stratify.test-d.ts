import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Dag } from "../../src/dag";
import {
  IdOperator,
  ParentDataOperator,
  ParentIdsOperator,
  stratify
} from "../../src/dag/create";

// initial types
interface Init {
  id: string;
  parentIds: string[];
}

const init = stratify();
expectAssignable<(inp: Init[]) => Dag<Init, undefined>>(init);
expectNotAssignable<(inp: unknown[]) => Dag<unknown, unknown>>(init);

// subtypes are preserved
interface Extra extends Init {
  extra: true;
}
declare const extraArray: Extra[];
expectType<Dag<Extra, undefined>>(init(extraArray));

// data narrows appropriately
interface MyParentIds extends ParentIdsOperator<{ pids: string[] }> {
  myParentIds: true;
}
interface Pids {
  id: string;
  pids: string[];
}
declare const myParentIds: MyParentIds;
const parentIds = init.parentIds(myParentIds);
expectAssignable<(inp: Pids[]) => Dag<Pids, undefined>>(parentIds);
expectNotAssignable<(inp: Init[]) => Dag<Init, undefined>>(parentIds);
expectType<MyParentIds>(parentIds.parentIds());
expectType<MyParentIds>(parentIds.parentData().wrapped);

interface MyId extends IdOperator<{ myid: string }> {
  id: true;
}
interface Ids {
  myid: string;
  pids: string[];
}
declare const myId: MyId;
const id = parentIds.id(myId);
expectAssignable<(inp: Ids[]) => Dag<Ids, undefined>>(id);
expectNotAssignable<(inp: Pids[]) => Dag<Pids, undefined>>(id);
expectType<MyParentIds>(id.parentIds());
expectType<MyParentIds>(id.parentData().wrapped);
expectType<MyId>(id.id());

interface MyParentData
  extends ParentDataOperator<{ node: true }, { link: true }> {
  myParentData: true;
}
interface Data {
  myid: string;
  node: true;
}
declare const myParentData: MyParentData;
const parentData = id.parentData(myParentData);
expectAssignable<(inp: Data[]) => Dag<Data, { link: true }>>(parentData);
expectNotAssignable<(inp: Ids[]) => Dag<Ids, undefined>>(parentData);
expectType<MyParentData>(parentData.parentIds().wrapped);
expectType<MyParentData>(parentData.parentData());
expectType<MyId>(parentData.id());
