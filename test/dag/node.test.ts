import {
  doub,
  doubleVee,
  doubleYou,
  en,
  ex,
  single,
  square,
  vee
} from "../dags";

import { dagStratify } from "../../src/";
import { def } from "../../src/utils";

test("roots() works for square", () => {
  const dag = dagStratify()(square);
  const [root] = dag.roots();
  expect(dag).toBe(root);
  const [otherRoot] = root.iroots();
  expect(otherRoot).toBe(root);
});

test("roots() works for N", () => {
  const dag = dagStratify()(en);
  const roots = dag.roots();
  expect(roots).toHaveLength(2);
});

test("childLinks() works for square", () => {
  const dag = dagStratify()(square);
  const [root] = dag.iroots();
  const childIds = new Set(root.ichildren().map((c) => c.id));
  const links = root.childLinks();
  expect(links).toHaveLength(2);
  for (const link of links) {
    expect(link.source).toBe(root);
    expect(childIds.has(link.target.id)).toBeTruthy();
    expect(link.points).toHaveLength(0);
    expect(link.data).toEqual(undefined);
  }
});

test("links() is correct for square", () => {
  const dag = dagStratify()(square);
  const links = new Map([
    ["0", new Set(["1", "2"])],
    ["1", new Set(["3"])],
    ["2", new Set(["3"])],
    ["3", new Set()]
  ]);
  for (const link of dag.links()) {
    expect(def(links.get(link.source.id)).has(link.target.id)).toBeTruthy();
  }
});

test("links() is correct for N", () => {
  const dag = dagStratify()(en);
  const links = new Map([
    ["0", new Set(["2", "3"])],
    ["1", new Set(["3"])],
    ["2", new Set()],
    ["3", new Set()]
  ]);
  for (const link of dag.links()) {
    expect(def(links.get(link.source.id)).has(link.target.id)).toBeTruthy();
  }
});

test("idescendants('breadth') is correct for square", () => {
  const dag = dagStratify()(square);
  const breadthIds = [...dag.idescendants("breadth").map((n) => n.id)];
  expect([
    ["0", "1", "2", "3"],
    ["0", "2", "1", "3"]
  ]).toContainEqual(breadthIds);
});

test("idescendants('unk') throws", () => {
  const dag = dagStratify()(single);
  expect(() => dag.idescendants("unk" as "before")).toThrow(
    "unknown iteration style: unk"
  );
});

test("size() is correct for square", () => {
  expect(dagStratify()(square).size()).toBeCloseTo(4);
});

test("size() is correct for N", () => {
  expect(dagStratify()(en).size()).toBeCloseTo(4);
});

test("size() is correct for X", () => {
  expect(dagStratify()(ex).size()).toBeCloseTo(7);
});

test("sum() is correct for square", () => {
  const dag = dagStratify()(square).sum((n) => parseInt(n.id));
  const expected = new Map([
    ["0", 6],
    ["1", 4],
    ["2", 5],
    ["3", 3]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("sum() is correct for N", () => {
  const dag = dagStratify()(en).sum((n) => parseInt(n.id));
  const expected = new Map([
    ["0", 5],
    ["1", 4],
    ["2", 2],
    ["3", 3]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("sum() is correct for X", () => {
  const dag = dagStratify()(ex).sum((n) => parseInt(n.id));
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
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("count() is correct for square", () => {
  const dag = dagStratify()(square).count();
  const expected = new Map([
    ["0", 1],
    ["1", 1],
    ["2", 1],
    ["3", 1]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("count() is correct for N", () => {
  const dag = dagStratify()(en).count();
  const expected = new Map([
    ["0", 2],
    ["1", 1],
    ["2", 1],
    ["3", 1]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("count() is correct for X", () => {
  const dag = dagStratify()(ex).count();
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
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("height() is correct for square", () => {
  const dag = dagStratify()(square).height();
  const expected = new Map([
    ["0", 2],
    ["1", 1],
    ["2", 1],
    ["3", 0]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("height() is correct for N", () => {
  const dag = dagStratify()(en).height();
  const expected = new Map([
    ["0", 1],
    ["1", 1],
    ["2", 0],
    ["3", 0]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("height() is correct for X", () => {
  const dag = dagStratify()(ex).height();
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
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("depth() is correct for square", () => {
  const dag = dagStratify()(square).depth();
  const expected = new Map([
    ["0", 0],
    ["1", 1],
    ["2", 1],
    ["3", 2]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("depth() is correct for N", () => {
  const dag = dagStratify()(en).depth();
  const expected = new Map([
    ["0", 0],
    ["1", 0],
    ["2", 1],
    ["3", 1]
  ]);
  for (const node of dag) {
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("depth() is correct for X", () => {
  const dag = dagStratify()(ex).depth();
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
    const exp = expected.get(node.id);
    if (exp === undefined) {
      throw new Error(`didn't define expected value for id: "${node.id}"`);
    }
    expect(node.value).toBeCloseTo(exp);
  }
});

test("split() is correct for point", () => {
  const dag = dagStratify()(single);
  const [split] = dag.split();
  expect(split).toBe(dag);
});

test("connected() is correct for point", () => {
  const dag = dagStratify()(single);
  expect(dag.connected()).toBeTruthy();
});

test("connected() is correct for two points", () => {
  const dag = dagStratify()(doub);
  expect(dag.connected()).toBeFalsy();
});

test("connected() is correct for v", () => {
  const dag = dagStratify()(vee);
  expect(dag.connected()).toBeTruthy();
});

test("connected() is correct for double v", () => {
  const dag = dagStratify()(doubleVee);
  expect(dag.connected()).toBeFalsy();
});

test("connected() is correct for w", () => {
  const dag = dagStratify()(doubleYou);
  expect(dag.connected()).toBeTruthy();
});
