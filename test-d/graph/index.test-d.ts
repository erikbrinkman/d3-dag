import { expectAssignable, expectError } from "tsd";
import { MutGraphLink, MutGraphNode, graph } from "../../src/graph";

const nullnull = graph<null, null>();
expectError(nullnull.node());
const nnnode = nullnull.node(null);
expectAssignable<MutGraphNode<null, null>>(nnnode);
expectError(nullnull.link(nnnode, nnnode));
expectError(nnnode.child(nnnode));
expectError(nnnode.parent(nnnode));
expectAssignable<MutGraphLink<null, null>>(nullnull.link(nnnode, nnnode, null));

const undefnull = graph<undefined, null>();
const unnode = undefnull.node();
expectAssignable<MutGraphNode<undefined, null>>(unnode);
expectError(undefnull.link(unnode, unnode));
expectError(unnode.child(unnode));
expectError(unnode.parent(unnode));
expectAssignable<MutGraphLink<undefined, null>>(
  undefnull.link(unnode, unnode, null)
);

const nullundef = graph<null, undefined>();
expectError(nullundef.node());
const nunode = nullundef.node(null);
expectAssignable<MutGraphNode<null, undefined>>(nunode);
expectAssignable<MutGraphLink<null, undefined>>(nullundef.link(nunode, nunode));

const undefundef = graph<undefined, undefined>();
const uunode = undefundef.node();
expectAssignable<MutGraphNode<undefined, undefined>>(uunode);
expectAssignable<MutGraphLink<undefined, undefined>>(
  undefundef.link(uunode, uunode)
);

const grf = graph<number | undefined, string | undefined>();
const num = grf.node(5);
expectAssignable<MutGraphNode<number | undefined, string | undefined>>(num);
const undef = grf.node();
expectAssignable<MutGraphNode<number | undefined, string | undefined>>(undef);
expectAssignable<MutGraphLink<number | undefined, string | undefined>>(
  num.child(undef, "str")
);
expectAssignable<MutGraphLink<number | undefined, string | undefined>>(
  undef.parent(num)
);
