import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { Dag } from "../../src/dag";
import {
  ChildrenDataOperator,
  ChildrenOperator,
  hierarchy,
} from "../../src/dag/create";

// initial types
interface Init {
  children?: readonly Init[] | undefined;
}

const init = hierarchy();
expectAssignable<(...inp: Init[]) => Dag<Init, undefined>>(init);
expectNotAssignable<(...inp: unknown[]) => Dag<unknown, unknown>>(init);

// data narrows appropriately
interface MyChildrenData
  extends ChildrenDataOperator<{ node: true }, { link: true }> {
  myChildrenData: true;
}
declare const myChildrenData: MyChildrenData;
const childrenData = init.childrenData(myChildrenData);
expectAssignable<
  (...inp: { node: true }[]) => Dag<{ node: true }, { link: true }>
>(childrenData);
expectNotAssignable<(...inp: Init[]) => Dag<Init, undefined>>(childrenData);
expectType<MyChildrenData>(childrenData.children().wrapped);
expectType<MyChildrenData>(childrenData.childrenData());

interface MyChildren extends ChildrenOperator<{ id: string }> {
  myChildren: true;
}
declare const myChildren: MyChildren;
const children = childrenData.children(myChildren);
expectAssignable<(...inp: { id: string }[]) => Dag<{ id: string }, undefined>>(
  children
);
expectNotAssignable<
  (...inp: { node: true }[]) => Dag<{ node: true }, { link: true }>
>(children);
expectType<MyChildren>(children.children());
expectType<MyChildren>(children.childrenData().wrapped);
