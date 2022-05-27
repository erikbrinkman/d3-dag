import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { MutGraph } from "../../src/graph";
import {
  graphStratify,
  ParentDataOperator,
  ParentIdsOperator,
} from "../../src/graph/stratify";
import { IdOperator } from "../../src/graph/utils";

// initial types
interface Init {
  id: string;
  parentIds: string[];
}

interface Stratify<ND, L> {
  <N extends ND>(inp: N[]): MutGraph<N, L>;
}

const init = graphStratify();
expectAssignable<Stratify<Init, undefined>>(init);
expectNotAssignable<Stratify<unknown, unknown>>(init);

// subtypes are preserved
interface Extra extends Init {
  extra: true;
}
declare const extraArray: Extra[];
expectType<MutGraph<Extra, undefined>>(init(extraArray));

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
expectAssignable<Stratify<Pids, undefined>>(parentIds);
expectNotAssignable<Stratify<Init, undefined>>(parentIds);
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
expectAssignable<Stratify<Ids, undefined>>(id);
expectNotAssignable<Stratify<Pids, undefined>>(id);
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
expectAssignable<Stratify<Data, { link: true }>>(parentData);
expectNotAssignable<Stratify<Ids, undefined>>(parentData);
expectType<MyParentData>(parentData.parentIds().wrapped);
expectType<MyParentData>(parentData.parentData());
expectType<MyId>(parentData.id());
