import { map } from "../../src/iters";
import { def } from "../../src/utils";
import {
  doub,
  doubleVee,
  doubleYou,
  en,
  ex,
  single,
  square,
  vee
} from "../examples";

test("roots() works for square", () => {
  const dag = square();
  const [root] = dag.roots();
  expect(dag).toBe(root);
  const [otherRoot] = root.iroots();
  expect(otherRoot).toBe(root);
});

test("roots() works for N", () => {
  const dag = en();
  const roots = dag.roots();
  expect(roots).toHaveLength(2);
});

test("childLinks() works for square", () => {
  const dag = square();
  const [root] = dag.iroots();
  const childIds = new Set(map(root.ichildren(), (c) => c.data.id));
  const links = root.childLinks();
  expect(links).toHaveLength(2);
  for (const link of links) {
    expect(link.source).toBe(root);
    expect(childIds.has(link.target.data.id)).toBeTruthy();
    expect(link.points).toHaveLength(0);
    expect(link.data).toEqual(undefined);
  }
});

test("links() is correct for square", () => {
  const dag = square();
  const links = new Map([
    ["0", new Set(["1", "2"])],
    ["1", new Set(["3"])],
    ["2", new Set(["3"])],
    ["3", new Set()]
  ]);
  for (const link of dag.links()) {
    expect(
      def(links.get(link.source.data.id)).has(link.target.data.id)
    ).toBeTruthy();
  }
});

test("links() is correct for N", () => {
  const dag = en();
  const links = new Map([
    ["0", new Set(["2", "3"])],
    ["1", new Set(["3"])],
    ["2", new Set()],
    ["3", new Set()]
  ]);
  for (const link of dag.links()) {
    expect(
      def(links.get(link.source.data.id)).has(link.target.data.id)
    ).toBeTruthy();
  }
});

test("idescendants('breadth') is correct for square", () => {
  const dag = square();
  const breadthIds = [...map(dag.idescendants("breadth"), (n) => n.data.id)];
  expect([
    ["0", "1", "2", "3"],
    ["0", "2", "1", "3"]
  ]).toContainEqual(breadthIds);
});

test("idescendants('unk') throws", () => {
  const dag = single();
  expect(() => dag.idescendants("unk" as "depth")).toThrow(
    "unknown iteration style: unk"
  );
});

test("size() is correct", () => {
  expect(square().size()).toBeCloseTo(4);
  expect(en().size()).toBeCloseTo(4);
  expect(ex().size()).toBeCloseTo(7);
});

test("sum() is correct for square", () => {
  const dag = square().sum((n) => parseInt(n.data.id));
  const expected = new Map([
    ["0", 6],
    ["1", 4],
    ["2", 5],
    ["3", 3]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("sum() is correct for N", () => {
  const dag = en().sum((n) => parseInt(n.data.id));
  const expected = new Map([
    ["0", 5],
    ["1", 4],
    ["2", 2],
    ["3", 3]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("sum() is correct for X", () => {
  const dag = ex().sum((n) => parseInt(n.data.id));
  const expected = new Map([
    ["0", 19],
    ["1", 19],
    ["2", 20],
    ["3", 18],
    ["4", 4],
    ["5", 11],
    ["6", 6]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("count() is correct for square", () => {
  const dag = square().count();
  const expected = new Map([
    ["0", 1],
    ["1", 1],
    ["2", 1],
    ["3", 1]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("count() is correct for N", () => {
  const dag = en().count();
  const expected = new Map([
    ["0", 2],
    ["1", 1],
    ["2", 1],
    ["3", 1]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("count() is correct for X", () => {
  const dag = ex().count();
  const expected = new Map([
    ["0", 2],
    ["1", 2],
    ["2", 2],
    ["3", 2],
    ["4", 1],
    ["5", 1],
    ["6", 1]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("height() is correct for square", () => {
  const dag = square().height();
  const expected = new Map([
    ["0", 2],
    ["1", 1],
    ["2", 1],
    ["3", 0]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("height() is correct for N", () => {
  const dag = en().height();
  const expected = new Map([
    ["0", 1],
    ["1", 1],
    ["2", 0],
    ["3", 0]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("height() is correct for X", () => {
  const dag = ex().height();
  const expected = new Map([
    ["0", 4],
    ["1", 3],
    ["2", 3],
    ["3", 2],
    ["4", 0],
    ["5", 1],
    ["6", 0]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("depth() is correct for square", () => {
  const dag = square().depth();
  const expected = new Map([
    ["0", 0],
    ["1", 1],
    ["2", 1],
    ["3", 2]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("depth() is correct for N", () => {
  const dag = en().depth();
  const expected = new Map([
    ["0", 0],
    ["1", 0],
    ["2", 1],
    ["3", 1]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("depth() is correct for X", () => {
  const dag = ex().depth();
  const expected = new Map([
    ["0", 0],
    ["1", 1],
    ["2", 0],
    ["3", 2],
    ["4", 3],
    ["5", 3],
    ["6", 4]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.data.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.data.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("split() is correct for point", () => {
  const dag = single();
  const [isplit] = dag.isplit();
  expect(isplit).toBe(dag);
  const [split] = dag.split();
  expect(split).toBe(dag);
});

test("split() is correct for doub", () => {
  const dag = doub();
  const roots = new Set(dag.iroots());
  const isplit = new Set(dag.isplit());
  expect(isplit).toEqual(roots);
  const split = new Set(dag.split());
  expect(split).toEqual(roots);
});

test("connected() is correct for point", () => {
  const dag = single();
  expect(dag.connected()).toBeTruthy();
});

test("connected() is correct for two points", () => {
  const dag = doub();
  expect(dag.connected()).toBeFalsy();
});

test("connected() is correct for v", () => {
  const dag = vee();
  expect(dag.connected()).toBeTruthy();
});

test("connected() is correct for double v", () => {
  const dag = doubleVee();
  expect(dag.connected()).toBeFalsy();
});

test("connected() is correct for w", () => {
  const dag = doubleYou();
  expect(dag.connected()).toBeTruthy();
});
