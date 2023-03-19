import { graph } from ".";
import { assert } from "../test-utils";
import { graphJson } from "./json";

test("graphJson() works for empty", () => {
  const builder = graphJson();
  const empty = graph<unknown, unknown>();
  const serialized = JSON.stringify(empty);
  const deser: unknown = JSON.parse(serialized);
  const copy = builder(deser);
  expect(copy.nnodes()).toBe(0);
  expect(copy.nlinks()).toBe(0);
});

test("graphJson() works for simple graph", () => {
  const builder = graphJson();
  const grf = graph<unknown, unknown>();
  const root = grf.node(0);
  const tail = grf.node(null);
  const linka = root.child(tail, 1);
  linka.points = [
    [1, 2],
    [3, 4],
  ];
  const linkb = root.child(tail, "b");

  const serialized = JSON.stringify(grf);
  const deser: unknown = JSON.parse(serialized);
  const copy = builder(deser);

  expect(copy.nnodes()).toBe(2);
  expect(copy.nlinks()).toBe(2);
  const [rut, tul] = copy.topological();
  expect(rut.data).toBe(root.data);
  expect(tul.data).toBe(tail.data);

  const [la, lb] = rut.childLinks();
  expect(la.data).toBe(linka.data);
  expect(la.points).toEqual([
    [1, 2],
    [3, 4],
  ]);
  expect(lb.data).toBe(linkb.data);
});

test("graphJson() serializes individual nodes", () => {
  const builder = graphJson();
  const grf = graph<undefined, undefined>();
  const a = grf.node();
  const b = grf.node();
  a.child(b);
  grf.node();
  a.x = 2;

  expect(grf.nnodes()).toBe(3);

  // only serialize connected component
  const serialized = JSON.stringify(a);
  const deser: unknown = JSON.parse(serialized);
  const copy = builder(deser);
  expect(copy.nnodes()).toBe(2);
  // returned the actual node
  expect("x" in copy ? copy.x : null).toBe(2);
});

class CustomNodeDatum {
  constructor(readonly num: number) {}

  toJSON(): unknown {
    return this.num + 1;
  }
}

function hydrateNode(data: unknown): CustomNodeDatum {
  assert(typeof data === "number");
  return new CustomNodeDatum(data - 1);
}

class CustomLinkDatum {
  constructor(readonly str: string) {}

  toJSON(): unknown {
    return `custom: ${this.str}`;
  }
}

function hydrateLink(data: unknown): CustomLinkDatum {
  assert(typeof data === "string");
  return new CustomLinkDatum(data.slice(8));
}

test("graphJson() works with custom hydration", () => {
  const builder = graphJson().nodeDatum(hydrateNode).linkDatum(hydrateLink);
  expect(builder.nodeDatum()).toBe(hydrateNode);
  expect(builder.linkDatum()).toBe(hydrateLink);

  const grf = graph<CustomNodeDatum, CustomLinkDatum>();
  const root = grf.node(new CustomNodeDatum(0));
  const tail = grf.node(new CustomNodeDatum(1));
  const linka = root.child(tail, new CustomLinkDatum("a"));
  const linkb = root.child(tail, new CustomLinkDatum("b"));

  const serialized = JSON.stringify(grf);
  const deser: unknown = JSON.parse(serialized);
  const copy = builder(deser);

  expect(copy.nnodes()).toBe(2);
  expect(copy.nlinks()).toBe(2);
  const [rut, tul] = copy.topological();
  expect(rut.data.num).toBe(root.data.num);
  expect(tul.data.num).toBe(tail.data.num);

  const [la, lb] = rut.childLinks();
  expect(la.data.str).toBe(linka.data.str);
  expect(lb.data.str).toBe(linkb.data.str);
});

// FIXME try removing TSD in favor of type tests in these tests...

test("graphJson() fails passing an arg to graphJson", () => {
  expect(() => graphJson(null as never)).toThrow("got arguments to graphJson");
});

test("graphJson() fails to parse invalid formats", () => {
  const builder = graphJson();
  expect(() => builder(null)).toThrow("was null");
  expect(() => builder({})).toThrow("didn't have 'nodes' and 'links'");
  expect(() => builder({ nodes: null, links: null })).toThrow(
    "'nodes' and 'links' weren't arrays"
  );
  expect(() => builder({ nodes: [null], links: [] })).toThrow(
    "'nodes' and 'links' didn't have the appropriate structure"
  );
  expect(() => builder({ nodes: [{ x: true }], links: [] })).toThrow(
    "'nodes' and 'links' didn't have the appropriate structure"
  );
  expect(() => builder({ nodes: [{ x: "0", y: "0" }], links: [] })).toThrow(
    "'nodes' and 'links' didn't have the appropriate structure"
  );
  expect(() => builder({ nodes: [{}], links: [{}] })).toThrow(
    "'nodes' and 'links' didn't have the appropriate structure"
  );
  expect(() =>
    builder({
      nodes: [{}],
      links: [{ source: null, target: null, points: [] }],
    })
  ).toThrow("'nodes' and 'links' didn't have the appropriate structure");
  expect(() =>
    builder({
      nodes: [{}],
      links: [{ source: 0, target: 0, points: [null] }],
    })
  ).toThrow("'nodes' and 'links' didn't have the appropriate structure");
});
