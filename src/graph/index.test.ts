import { graph, GraphLink, GraphNode, MutGraphLink, MutGraphNode } from ".";
import { length, map, reduce, some } from "../iters";

test("empty graph", () => {
  const grf = graph<never, never>();

  expect([...grf.nodes()]).toEqual([]);
  expect([...grf.links()]).toEqual([]);
  expect([...grf.roots()]).toEqual([]);
  expect([...grf.leaves()]).toEqual([]);
  expect(grf.nnodes()).toBe(0);
  expect(grf.nlinks()).toBe(0);
  expect([...grf.split()]).toEqual([]);
  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(true);
});

test("singleton graph", () => {
  const grf = graph<undefined, never>();
  const node = grf.node();

  expect([...grf.nodes()]).toEqual([node]);
  expect([...grf.links()]).toEqual([]);
  expect([...grf.roots()]).toEqual([node]);
  expect([...grf.leaves()]).toEqual([node]);
  expect(grf.nnodes()).toBe(1);
  expect(grf.nlinks()).toBe(0);
  expect([...grf.split()]).toEqual([node]);
  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(true);

  expect([...node.nodes()]).toEqual([node]);
  expect([...node.links()]).toEqual([]);
  expect([...node.roots()]).toEqual([node]);
  expect([...node.leaves()]).toEqual([node]);
  expect([...node.ancestors()]).toEqual([node]);
  expect([...node.descendants()]).toEqual([node]);
  expect(node.nnodes()).toBe(1);
  expect(node.nlinks()).toBe(0);
  expect([...node.split()]).toEqual([node]);
  expect(node.connected()).toBe(true);
  expect(node.multi()).toBe(false);
  expect(node.acyclic()).toBe(true);

  expect(node.nparents()).toBe(0);
  expect(node.nparentLinks()).toBe(0);
  expect(node.nparentLinksTo(node)).toBe(0);
  expect([...node.parents()]).toEqual([]);
  expect([...node.parentCounts()]).toEqual([]);
  expect([...node.parentLinks()]).toEqual([]);
  expect(node.nchildren()).toBe(0);
  expect(node.nchildLinks()).toBe(0);
  expect(node.nchildLinksTo(node)).toBe(0);
  expect([...node.children()]).toEqual([]);
  expect([...node.childCounts()]).toEqual([]);
  expect([...node.childLinks()]).toEqual([]);
});

test("line graph", () => {
  const grf = graph<string, undefined>();

  const up = grf.node("up");
  const down = up.node("down");
  const link = up.child(down);

  expect([...grf.nodes()]).toEqual([down, up]);
  expect([...grf.links()]).toEqual([link]);
  expect([...grf.roots()]).toEqual([up]);
  expect([...grf.leaves()]).toEqual([down]);
  expect(grf.nnodes()).toBe(2);
  expect(grf.nlinks()).toBe(1);
  expect([...grf.split()]).toHaveLength(1);
  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(true);

  expect([...up.nodes()]).toEqual([up, down]);
  expect([...up.links()]).toEqual([link]);
  expect([...up.roots()]).toEqual([up]);
  expect([...up.leaves()]).toEqual([down]);
  expect([...up.ancestors()]).toEqual([up]);
  expect([...up.descendants()]).toEqual([up, down]);
  expect(up.nnodes()).toBe(2);
  expect(up.nlinks()).toBe(1);
  expect([...up.split()]).toHaveLength(1);
  expect(up.connected()).toBe(true);
  expect(up.multi()).toBe(false);
  expect(up.acyclic()).toBe(true);

  expect(up.nparents()).toBe(0);
  expect(up.nparentLinks()).toBe(0);
  expect(up.nparentLinksTo(up)).toBe(0);
  expect(up.nparentLinksTo(down)).toBe(0);
  expect([...up.parents()]).toEqual([]);
  expect([...up.parentCounts()]).toEqual([]);
  expect([...up.parentLinks()]).toEqual([]);
  expect(up.nchildren()).toBe(1);
  expect(up.nchildLinks()).toBe(1);
  expect(up.nchildLinksTo(up)).toBe(0);
  expect(up.nchildLinksTo(down)).toBe(1);
  expect([...up.children()]).toEqual([down]);
  expect([...up.childCounts()]).toEqual([[down, 1]]);
  expect([...up.childLinks()]).toEqual([link]);

  expect([...down.ancestors()]).toEqual([down, up]);
  expect([...down.descendants()]).toEqual([down]);
  expect(down.nparents()).toBe(1);
  expect(down.nparentLinks()).toBe(1);
  expect(down.nparentLinksTo(down)).toBe(0);
  expect(down.nparentLinksTo(up)).toBe(1);
  expect([...down.parents()]).toEqual([up]);
  expect([...down.parentCounts()]).toEqual([[up, 1]]);
  expect([...down.parentLinks()]).toEqual([link]);
  expect(down.nchildren()).toBe(0);
  expect(down.nchildLinks()).toBe(0);
  expect(down.nchildLinksTo(down)).toBe(0);
  expect(down.nchildLinksTo(up)).toBe(0);
  expect([...down.children()]).toEqual([]);
  expect([...down.childCounts()]).toEqual([]);
  expect([...down.childLinks()]).toEqual([]);

  link.delete();
  link.delete();

  expect(grf.connected()).toBe(false);
  expect([...grf.roots()]).toEqual([up, down]);
  expect([...grf.leaves()]).toEqual([up, down]);
  expect([...up.roots()]).toEqual([up]);
  expect([...up.leaves()]).toEqual([up]);
  expect([...down.roots()]).toEqual([down]);
  expect([...down.leaves()]).toEqual([down]);
});

test("multi graph", () => {
  const grf = graph<string, boolean>();

  const up = grf.node("up");
  const down = grf.node("down");
  expect(up.nchildLinksTo(down)).toBe(0);
  expect(down.nparentLinksTo(up)).toBe(0);

  const first = up.child(down, true);
  expect(up.nchildLinksTo(down)).toBe(1);
  expect(down.nparentLinksTo(up)).toBe(1);

  const second = up.child(down, false);
  expect(up.nchildLinksTo(down)).toBe(2);
  expect(down.nparentLinksTo(up)).toBe(2);

  expect([...grf.nodes()]).toEqual([down, up]);
  expect([...grf.links()]).toEqual([first, second]);
  expect([...grf.roots()]).toEqual([up]);
  expect([...grf.leaves()]).toEqual([down]);
  expect(grf.nnodes()).toBe(2);
  expect(grf.nlinks()).toBe(2);
  expect([...grf.split()]).toHaveLength(1);
  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(true);
  expect(grf.acyclic()).toBe(true);

  expect([...up.ancestors()]).toEqual([up]);
  expect([...up.descendants()]).toEqual([up, down]);
  expect(up.nchildren()).toBe(1);
  expect(up.nchildLinks()).toBe(2);
  expect(up.nchildLinksTo(up)).toBe(0);
  expect(up.nchildLinksTo(down)).toBe(2);
  expect([...up.children()]).toEqual([down]);
  expect([...up.childCounts()]).toEqual([[down, 2]]);
  expect([...up.childLinks()]).toEqual([first, second]);

  expect([...down.ancestors()]).toEqual([down, up]);
  expect([...down.descendants()]).toEqual([down]);
  expect(down.nparents()).toBe(1);
  expect(down.nparentLinks()).toBe(2);
  expect(down.nparentLinksTo(down)).toBe(0);
  expect(down.nparentLinksTo(up)).toBe(2);
  expect([...down.parents()]).toEqual([up]);
  expect([...down.parentCounts()]).toEqual([[up, 2]]);
  expect([...down.parentLinks()]).toEqual([first, second]);
});

test("cycle graph", () => {
  const grf = graph<boolean, boolean>();

  const above = grf.node(true);
  const below = grf.node(false);

  const down = above.child(below, true);
  const up = above.parent(below, false);

  expect([...grf.nodes()]).toEqual([below, above]);
  expect([...grf.links()]).toEqual([up, down]);
  expect([...grf.roots()]).toEqual([below]); // brittle [above]
  expect([...grf.leaves()]).toEqual([below]); // brittle [above]
  expect(grf.nnodes()).toBe(2);
  expect(grf.nlinks()).toBe(2);
  expect([...grf.split()]).toHaveLength(1);
  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(false);

  expect([...above.ancestors()]).toEqual([above, below]);
  expect([...above.descendants()]).toEqual([above, below]);
  expect(above.nparents()).toBe(1);
  expect(above.nparentLinks()).toBe(1);
  expect(above.nparentLinksTo(below)).toBe(1);
  expect([...above.parents()]).toEqual([below]);
  expect([...above.parentCounts()]).toEqual([[below, 1]]);
  expect([...above.parentLinks()]).toEqual([up]);
  expect([...above.parentLinksTo(below)]).toEqual([up]);
  expect(above.nchildren()).toBe(1);
  expect(above.nchildLinks()).toBe(1);
  expect(above.nchildLinksTo(below)).toBe(1);
  expect([...above.children()]).toEqual([below]);
  expect([...above.childCounts()]).toEqual([[below, 1]]);
  expect([...above.childLinks()]).toEqual([down]);
  expect([...above.childLinksTo(below)]).toEqual([down]);

  expect([...below.ancestors()]).toEqual([below, above]);
  expect([...below.descendants()]).toEqual([below, above]);
});

test("disconnected graph", () => {
  const grf = graph<boolean, never>();

  const above = grf.node(true);
  const below = grf.node(false);

  expect([...grf.nodes()].sort()).toEqual([above, below]);
  expect([...grf.nodes()].sort()).toEqual([above, below]);
  expect([...grf.links()]).toEqual([]);
  expect(grf.nnodes()).toBe(2);
  expect(grf.nlinks()).toBe(0);
  expect([...grf.split()]).toHaveLength(2);
  expect(grf.connected()).toBe(false);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(true);

  expect([...above.nodes()]).toEqual([above]);
  expect([...above.links()]).toEqual([]);
  expect([...above.ancestors()]).toEqual([above]);
  expect([...above.descendants()]).toEqual([above]);
  expect(above.nnodes()).toBe(1);
  expect(above.nlinks()).toBe(0);
  expect([...above.split()]).toHaveLength(1);
  expect(above.connected()).toBe(true);
  expect(above.multi()).toBe(false);
  expect(above.acyclic()).toBe(true);

  expect(above.nparents()).toBe(0);
  expect(above.nparentLinks()).toBe(0);
  expect(above.nparentLinksTo(below)).toBe(0);
  expect([...above.parents()]).toEqual([]);
  expect([...above.parentCounts()]).toEqual([]);
  expect([...above.parentLinks()]).toEqual([]);
  expect([...above.parentLinksTo(below)]).toEqual([]);
  expect(above.nchildren()).toBe(0);
  expect(above.nchildLinks()).toBe(0);
  expect(above.nchildLinksTo(below)).toBe(0);
  expect([...above.children()]).toEqual([]);
  expect([...above.childCounts()]).toEqual([]);
  expect([...above.childLinks()]).toEqual([]);
  expect([...above.childLinksTo(below)]).toEqual([]);

  expect([...below.nodes()]).toEqual([below]);
  expect([...below.links()]).toEqual([]);
  expect([...below.ancestors()]).toEqual([below]);
  expect([...below.descendants()]).toEqual([below]);
  expect(below.nnodes()).toBe(1);
  expect(below.nlinks()).toBe(0);
  expect([...below.split()]).toHaveLength(1);
  expect(below.connected()).toBe(true);
  expect(below.multi()).toBe(false);
  expect(below.acyclic()).toBe(true);

  expect(below.nparents()).toBe(0);
  expect(below.nparentLinks()).toBe(0);
  expect(below.nparentLinksTo(above)).toBe(0);
  expect([...below.parents()]).toEqual([]);
  expect([...below.parentCounts()]).toEqual([]);
  expect([...below.parentLinks()]).toEqual([]);
  expect([...below.parentLinksTo(above)]).toEqual([]);
  expect(below.nchildren()).toBe(0);
  expect(below.nchildLinks()).toBe(0);
  expect(below.nchildLinksTo(above)).toBe(0);
  expect([...below.children()]).toEqual([]);
  expect([...below.childCounts()]).toEqual([]);
  expect([...below.childLinks()]).toEqual([]);
  expect([...below.childLinksTo(above)]).toEqual([]);
});

test("complex graph", () => {
  const grf = graph<undefined, undefined>();
  // a
  // |\
  // m |
  // |/
  // b

  const above = grf.node();
  const middle = grf.node();
  const below = grf.node();
  above.child(below);
  above.child(middle);
  below.parent(middle);

  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(true);
  expect([...middle.ancestors()]).toEqual([middle, above]);
  expect([...middle.descendants()]).toEqual([middle, below]);
});

test("dynamic graph", () => {
  const grf = graph<undefined, undefined>();

  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(true);

  const one = grf.node();
  const two = grf.node();
  const three = grf.node();

  expect(grf.connected()).toBe(false);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(true);
  expect([...grf.roots()]).toEqual([one, two, three]);
  expect([...grf.leaves()]).toEqual([one, two, three]);

  grf.link(one, two);
  const lcyc = grf.link(two, one);

  expect(grf.connected()).toBe(false);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(false);
  expect([...grf.roots()]).toEqual([one, three]); // brittle [two, three]
  expect([...grf.leaves()]).toEqual([one, three]); // brittle [two, three]

  const lconn = grf.link(two, three);

  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(false);
  expect([...grf.roots()]).toEqual([two]); // brittle [one]
  expect([...grf.leaves()]).toEqual([three]);

  grf.link(one, two);

  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(true);
  expect(grf.acyclic()).toBe(false);
  expect([...grf.roots()]).toEqual([two]); // brittle [one]
  expect([...grf.leaves()]).toEqual([three]);

  lconn.delete();

  expect(grf.connected()).toBe(false);
  expect(grf.multi()).toBe(true);
  expect(grf.acyclic()).toBe(false);

  expect(one.connected()).toBe(true);
  expect(one.multi()).toBe(true);
  expect(one.acyclic()).toBe(false);

  expect(three.connected()).toBe(true);
  expect(three.multi()).toBe(false);
  expect(three.acyclic()).toBe(true);

  lcyc.delete();

  expect(grf.connected()).toBe(false);
  expect(grf.multi()).toBe(true);
  expect(grf.acyclic()).toBe(true);
  expect([...grf.roots()]).toEqual([one, three]);
  expect([...grf.leaves()]).toEqual([two, three]);

  grf.link(two, three);

  expect(grf.connected()).toBe(true);
  expect(grf.multi()).toBe(true);
  expect(grf.acyclic()).toBe(true);
  expect([...grf.roots()]).toEqual([one]);
  expect([...grf.leaves()]).toEqual([three]);

  two.delete();
  expect(grf.nnodes()).toBe(2);
  expect(grf.nlinks()).toBe(0);

  expect(grf.connected()).toBe(false);
  expect(grf.multi()).toBe(false);
  expect(grf.acyclic()).toBe(true);
});

test("multi caching", () => {
  const grf = graph<undefined, undefined>();
  const a = grf.node();
  const b = grf.node();
  const c = grf.node();

  const first = a.child(b);
  expect(grf.multi()).toBeFalsy();
  expect(grf.connected()).toBeFalsy();

  const extra = b.child(c);
  expect(grf.connected()).toBeTruthy();

  extra.delete();
  expect(grf.multi()).toBeFalsy();

  const second = a.child(b);
  expect(grf.multi()).toBeTruthy();
  expect(a.multi()).toBeTruthy();

  first.delete();
  expect(a.multi()).toBeFalsy();

  second.delete();
  expect(a.multi()).toBeFalsy();
});

test("invalid cache", () => {
  const grf = graph<undefined, undefined>();
  const a = grf.node();
  const b = grf.node();
  const c = grf.node();
  const d = grf.node();
  const e = grf.node();

  a.child(b);
  b.child(c);

  c.child(d);
  d.child(e).delete();

  a.child(c);
  expect(a.nchildLinksTo(c)).toBe(1);
});

test("topological() ranks inverted case", () => {
  const grf = graph<number, undefined>();
  const a = grf.node(1);
  const b = grf.node(2);
  grf.link(a, b);
  expect(grf.topological(({ data }) => -data)).toEqual([b, a]);
  expect(a.topological(({ data }) => -data)).toEqual([b, a]);
});

test("topological() selects alternatives in cycle", () => {
  const grf = graph<number, undefined>();
  const a = grf.node(1);
  const b = grf.node(2);
  grf.link(a, b);
  grf.link(b, a);
  expect(grf.topological(({ data }) => -data)).toEqual([b, a]);
  expect(grf.topological(({ data }) => data)).toEqual([a, b]);
});

test("topological() handles rank ties", () => {
  const grf = graph<number, undefined>();
  const a = grf.node(-3);
  const b = grf.node(-2);
  const c = grf.node(-1);
  const d = grf.node(1);
  const e = grf.node(2);
  const f = grf.node(3);
  grf.link(a, b);
  grf.link(b, c);
  grf.link(c, d);
  grf.link(d, c);
  grf.link(d, e);
  grf.link(e, f);
  const expected = [a, b, c, d, e, f];
  expect(grf.topological(({ data }) => Math.floor(data / 2))).toEqual(expected);
});

test("topological() ranks inverted square", () => {
  const grf = graph<number, undefined>();
  const a = grf.node(3);
  const b = grf.node(2);
  const c = grf.node(1);
  const d = grf.node(0);
  a.child(b);
  a.child(c);
  b.child(d);
  c.child(d);
  expect([
    [d, b, c, a],
    [d, c, b, a],
  ]).toContainEqual(grf.topological(({ data }) => data));
});

test("topological() pops from the bottom for rank", () => {
  // this is a pretty degenerate case, but is an edge case none the less
  const grf = graph<number, undefined>();
  const a = grf.node(1);
  const b = grf.node(2);
  const c = grf.node(3);
  a.child(b);
  b.child(a);
  b.child(a);
  b.child(c);
  b.child(c);
  c.child(b);

  expect(grf.topological(({ data }) => data)).toEqual([a, b, c]);
});

test("methods work with invalid nodes", () => {
  const grf = graph<null, null>();
  const node = grf.node(null);

  expect(node.nchildLinksTo(new FakeNode())).toBe(0);
  expect([...node.childLinksTo(new FakeNode())]).toEqual([]);
  expect(node.nparentLinksTo(new FakeNode())).toBe(0);
  expect([...node.parentLinksTo(new FakeNode())]).toEqual([]);
});

test("caching", () => {
  const grf = graph<undefined, undefined>();
  const a = grf.node();
  const b = grf.node();
  a.child(b).delete();
  a.child(b);

  expect(a.nlinks()).toBe(1);
  expect(a.nnodes()).toBe(2);
  expect(a.multi()).toBeFalsy();
  expect(a.acyclic()).toBeTruthy();
});

test("positioning works", () => {
  const grf = graph<null, null>();
  const node = grf.node(null);
  expect(node.ux).toBeUndefined();
  expect(() => node.x).toThrow("`ux` is undefined");
  expect(node.uy).toBeUndefined();
  expect(() => node.y).toThrow("`uy` is undefined");

  node.x = 0;
  node.y = 1;
  expect(node.ux).toBe(0);
  expect(node.x).toBe(0);
  expect(node.uy).toBe(1);
  expect(node.y).toBe(1);
});

test("typescript errors", () => {
  const grf = graph<null, null>();
  const node = grf.node(null);
  // @ts-expect-error wrong data
  const other = grf.node();
  grf.link(node, other, null);
  // @ts-expect-error wrong data
  grf.link(node, other);
  // @ts-expect-error wrong data
  node.link(node, other, 4);
  // @ts-expect-error wrong data
  node.child(other, "");
  // @ts-expect-error wrong data
  other.parent(node, 0n);

  expect(grf.nnodes()).toBe(2);
  expect(grf.nlinks()).toBe(5);
});

test("link() throws on self loops", () => {
  const grf = graph<undefined, undefined>();
  const node = grf.node();
  expect(() => grf.link(node, node)).toThrow("self loops");
});

test("node() throws on deleted nodes", () => {
  const grf = graph<undefined, undefined>();
  const one = grf.node();
  one.delete();
  one.delete();
  expect(() => one.node()).toThrow("deleted");
});

test("link() throws on deleted nodes", () => {
  const grf = graph<undefined, undefined>();
  const one = grf.node();
  const two = grf.node();
  two.delete();
  expect(() => grf.link(one, two)).toThrow("deleted");
  expect(() => grf.link(two, one)).toThrow("deleted");
});

class FakeNode implements GraphNode<null, null> {
  data = null;
  x = 0;
  y = 0;

  *[Symbol.iterator]() {
    // noop
  }

  *nodes(): IterableIterator<GraphNode<null, null>> {
    // noop
  }

  topological(): GraphNode<null, null>[] {
    return [];
  }

  *links(): IterableIterator<GraphLink<null, null>> {
    // noop
  }

  nnodes(): number {
    return 0;
  }

  nlinks(): number {
    return 0;
  }

  *split(): IterableIterator<GraphNode<null, null>> {
    // noop
  }

  connected(): boolean {
    return true;
  }

  multi(): boolean {
    return false;
  }

  acyclic(): boolean {
    return false;
  }

  nparents(): number {
    return 0;
  }

  nchildren(): number {
    return 0;
  }

  nparentLinks(): number {
    return 0;
  }

  nchildLinks(): number {
    return 0;
  }

  nparentLinksTo(): number {
    return 0;
  }

  *parentLinksTo(): IterableIterator<GraphLink<null, null>> {
    // noop
  }

  nchildLinksTo(): number {
    return 0;
  }

  *childLinksTo(): IterableIterator<GraphLink<null, null>> {
    // noop
  }

  *parents(): IterableIterator<FakeNode> {
    // noop
  }

  *children(): IterableIterator<FakeNode> {
    // noop
  }

  *parentCounts(): IterableIterator<[FakeNode, number]> {
    // noop
  }

  *childCounts(): IterableIterator<[FakeNode, number]> {
    // noop
  }

  *parentLinks(): IterableIterator<GraphLink<null, null>> {
    // noop
  }

  *childLinks(): IterableIterator<GraphLink<null, null>> {
    // noop
  }

  *descendants(): IterableIterator<GraphNode<null, null>> {
    // noop
  }

  *ancestors(): IterableIterator<GraphNode<null, null>> {
    // noop
  }

  *roots(): IterableIterator<GraphNode<null, null>> {
    // noop
  }

  *leaves(): IterableIterator<GraphNode<null, null>> {
    // noop
  }

  toJSON(): unknown {
    return null;
  }
}

function acyclic(nodes: Iterable<GraphNode>): boolean {
  const seen = new Set<GraphNode>();
  for (const node of nodes) {
    for (const child of node.children()) {
      if (seen.has(child)) {
        return false;
      }
    }
    seen.add(node);
  }
  return true;
}

test("topological edge case", () => {
  const grf = graph<number, undefined>();
  const one = grf.node(1);
  const three = grf.node(3);
  const five = grf.node(5);
  const seven = grf.node(7);
  one.child(five);
  three.child(seven);
  one.child(five);
  three.child(seven);
  three.child(seven);
  three.child(five);
  seven.child(one);

  const ordered = [...map(grf.topological(), (node) => node.data)];
  expect(ordered).toEqual([3, 7, 1, 5]);
});

test("random modifications", () => {
  const grf = graph<number, number>();
  const nodes: MutGraphNode<number, number>[] = [];
  const links: MutGraphLink<number, number>[] = [];

  for (let i = 0; i < 1000; ++i) {
    // test graph invariants
    expect(grf.nnodes()).toBe(nodes.length);
    expect(grf.nlinks()).toBe(links.length);
    expect(grf.nnodes()).toBe(length(grf.nodes()));
    expect(grf.nlinks()).toBe(
      reduce(grf.nodes(), (t, n) => t + n.nchildLinks(), 0),
    );
    expect(grf.nlinks()).toBe(
      reduce(grf.nodes(), (t, n) => t + n.nparentLinks(), 0),
    );
    const [first] = grf.nodes();
    expect(grf.connected()).toBe((first?.nnodes() ?? 0) === grf.nnodes());
    expect(grf.multi()).toBe(
      some(grf.nodes(), (n) => some(n.childCounts(), ([, c]) => c > 1)),
    );
    expect(grf.multi()).toBe(
      some(grf.nodes(), (n) => some(n.parentCounts(), ([, c]) => c > 1)),
    );
    const expected = acyclic(grf.topological());
    expect(grf.acyclic()).toBe(expected);
    expect(grf.connected()).toBe(length(grf.split()) <= 1);

    // test component invariants
    let tnodes = 0;
    let tlinks = 0;
    for (const comp of grf.split()) {
      expect(comp.nnodes()).toBe(length(comp.nodes()));
      expect(comp.nlinks()).toBe(
        reduce(comp.nodes(), (t, n) => t + n.nchildLinks(), 0),
      );
      expect(comp.nlinks()).toBe(
        reduce(comp.nodes(), (t, n) => t + n.nparentLinks(), 0),
      );
      expect(comp.multi()).toBe(
        some(comp.nodes(), (n) => some(n.childCounts(), ([, c]) => c > 1)),
      );
      expect(comp.multi()).toBe(
        some(comp.nodes(), (n) => some(n.parentCounts(), ([, c]) => c > 1)),
      );
      expect(comp.acyclic()).toBe(acyclic(comp.topological()));
      tnodes += comp.nnodes();
      tlinks += comp.nlinks();
    }
    expect(tnodes).toBe(grf.nnodes());
    expect(tlinks).toBe(grf.nlinks());

    // randomly modify graph
    const choice = Math.floor(Math.random() * (links.length ? 3 : 2));
    if (nodes.length < 4 || (choice === 0 && grf.connected())) {
      // add node
      nodes.push(grf.node(i));
    } else if (nodes.length > 6 || choice === 0) {
      // remove node
      const ind = Math.floor(Math.random() * nodes.length);
      const node = nodes[ind];
      for (let j = links.length - 1; j >= 0; --j) {
        const { source, target } = links[j];
        if (source === node || target === node) {
          links[j] = links[links.length - 1];
          links.pop();
        }
      }
      node.delete();
      nodes[ind] = nodes[nodes.length - 1];
      nodes.pop();
    } else if (choice === 1 && !grf.connected()) {
      // add link
      const source = Math.floor(Math.random() * nodes.length);
      let target = Math.floor(Math.random() * (nodes.length - 1));
      if (target >= source) ++target;
      const sourceNode = nodes[source];
      const targetNode = nodes[target];
      links.push(grf.link(sourceNode, targetNode, i));
    } else if (choice === 1) {
      // remove link
      const ind = Math.floor(Math.random() * links.length);
      const link = links[ind];
      link.delete();
      links[ind] = links[links.length - 1];
      links.pop();
    } else if (!grf.multi()) {
      // add multi link
      const ind = Math.floor(Math.random() * links.length);
      const { source, target } = links[ind];
      links.push(grf.link(source, target, i));
    } else {
      // remove multi link
      let n = 0;
      let rem = 0;
      for (const [i, { source, target }] of links.entries()) {
        if (source.nchildLinksTo(target) > 1 && Math.random() < 1 / ++n) {
          rem = i;
        }
      }
      const link = links[rem];
      link.delete();
      links[rem] = links[links.length - 1];
      links.pop();
    }
  }
});
