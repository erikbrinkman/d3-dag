import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import { MutGraph } from "../../src/graph";
import {
  ChildrenDataOperator,
  ChildrenOperator,
  graphHierarchy,
} from "../../src/graph/hierarchy";

// initial types
interface Init {
  children?: Iterable<Init> | undefined;
}

interface Hierarchy<N, L> {
  (...inp: N[]): MutGraph<N, L>;
}

const init = graphHierarchy();
expectAssignable<Hierarchy<Init, undefined>>(init);
expectNotAssignable<Hierarchy<unknown, unknown>>(init);

// data narrows appropriately
interface MyChildrenData
  extends ChildrenDataOperator<{ node: true }, { link: true }> {
  myChildrenData: true;
}
declare const myChildrenData: MyChildrenData;
const childrenData = init.childrenData(myChildrenData);
expectAssignable<Hierarchy<{ node: true }, { link: true }>>(childrenData);
expectNotAssignable<Hierarchy<Init, undefined>>(childrenData);
expectType<MyChildrenData>(childrenData.children().wrapped);
expectType<MyChildrenData>(childrenData.childrenData());

interface MyChildren extends ChildrenOperator<{ id: string }> {
  myChildren: true;
}
declare const myChildren: MyChildren;
const children = childrenData.children(myChildren);
expectAssignable<Hierarchy<{ id: string }, undefined>>(children);
expectNotAssignable<Hierarchy<{ node: true }, { link: true }>>(children);
expectType<MyChildren>(children.children());
expectType<MyChildren>(children.childrenData().wrapped);
