import { graph } from "../graph";
import { sugify, unsugify } from "./sugify";

function layering(): void {
  // noop
}

test("sugify() / unsugify() works for single node", () => {
  const grf = graph<undefined, undefined>();
  const node = grf.node();
  node.y = 0;
  const layers = sugify(grf, 1, layering);

  const [[sugi]] = layers;
  expect(sugi.data.layer).toEqual(0);
  expect("node" in sugi.data).toBe(true);

  sugi.x = 1;
  sugi.y = 1;

  unsugify(layers);
  expect(node.x).toEqual(1);
  expect(node.y).toEqual(1);
});

test("sugify() / unsugify() works for edges", () => {
  const grf = graph<undefined, undefined>();
  const above = grf.node();
  const below = grf.node();
  const link = grf.link(above, below);
  above.y = 0;
  below.y = 1;
  const layers = sugify(grf, 2, layering);

  const [[topSugi], [bottomSugi]] = layers;
  expect(topSugi.data.layer).toEqual(0);
  expect("node" in topSugi.data).toBe(true);
  expect(bottomSugi.data.layer).toEqual(1);
  expect("node" in bottomSugi.data).toBe(true);

  topSugi.x = 1;
  topSugi.y = 1;
  bottomSugi.x = 1;
  bottomSugi.y = 2;
  unsugify(layers);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(1);
  expect(below.y).toBe(2);
  expect(link.points).toEqual([
    [1, 1],
    [1, 2],
  ]);
});

test("sugify() / unsugify() works for extended edges", () => {
  const grf = graph<undefined, undefined>();
  const above = grf.node();
  const below = grf.node();
  const link = grf.link(above, below);
  above.y = 0;
  below.y = 2;
  const layers = sugify(grf, 3, layering);

  const [[topSugi], [linkSugi], [bottomSugi]] = layers;
  expect(topSugi.data.layer).toEqual(0);
  expect("node" in topSugi.data).toBe(true);
  expect(linkSugi.data.layer).toEqual(1);
  expect("link" in linkSugi.data).toBe(true);
  expect(bottomSugi.data.layer).toEqual(2);
  expect("node" in bottomSugi.data).toBe(true);

  topSugi.x = 1;
  topSugi.y = 1;
  linkSugi.x = 2;
  linkSugi.y = 2;
  bottomSugi.x = 1;
  bottomSugi.y = 3;
  unsugify(layers);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(1);
  expect(below.y).toBe(3);
  expect(link.points).toEqual([
    [1, 1],
    [2, 2],
    [1, 3],
  ]);
});

test("sugify() works for extended edges", () => {
  const grf = graph<undefined, undefined>();
  const above = grf.node();
  const below = grf.node();
  const link = grf.link(below, above);
  above.y = 0;
  below.y = 1;
  const layers = sugify(grf, 2, layering);

  const [[topSugi], [bottomSugi]] = layers;
  expect(topSugi.data.layer).toEqual(0);
  expect("node" in topSugi.data).toBe(true);
  expect(bottomSugi.data.layer).toEqual(1);
  expect("node" in bottomSugi.data).toBe(true);

  topSugi.x = 1;
  topSugi.y = 1;
  bottomSugi.x = 2;
  bottomSugi.y = 3;
  unsugify(layers);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(2);
  expect(below.y).toBe(3);
  expect(link.points).toEqual([
    [2, 3],
    [1, 1],
  ]);
});

test("sugify() works for extended inverted edges", () => {
  const grf = graph<undefined, undefined>();
  const above = grf.node();
  const below = grf.node();
  const link = grf.link(below, above);
  above.y = 0;
  below.y = 2;
  const layers = sugify(grf, 3, layering);

  const [[topSugi], [linkSugi], [bottomSugi]] = layers;
  expect(topSugi.data.layer).toEqual(0);
  expect("node" in topSugi.data).toBe(true);
  expect(linkSugi.data.layer).toEqual(1);
  expect("link" in linkSugi.data).toBe(true);
  expect(bottomSugi.data.layer).toEqual(2);
  expect("node" in bottomSugi.data).toBe(true);

  topSugi.x = 1;
  topSugi.y = 1;
  linkSugi.x = 1.5;
  linkSugi.y = 2;
  bottomSugi.x = 2;
  bottomSugi.y = 3;
  unsugify(layers);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(2);
  expect(below.y).toBe(3);
  expect(link.points).toEqual([
    [2, 3],
    [1.5, 2],
    [1, 1],
  ]);
});

test("sugify() throws for missing layer", () => {
  const grf = graph<undefined, undefined>();
  grf.node();
  expect(() => sugify(grf, 0, layering)).toThrow(
    "custom layering 'layering' didn't assign a layer to a node"
  );
});

test("sugify() throws for edge in the same layer", () => {
  const grf = graph<undefined, undefined>();
  const left = grf.node();
  const right = grf.node();
  grf.link(left, right);
  left.y = 0;
  right.y = 0;
  expect(() => sugify(grf, 1, layering)).toThrow(
    "custom layering 'layering' assigned nodes with an edge to the same layer"
  );
});

test("sugify() throws for un-separated multi-graph", () => {
  const grf = graph<undefined, undefined>();
  const above = grf.node();
  const below = grf.node();
  grf.link(above, below);
  grf.link(above, below);
  above.y = 0;
  below.y = 1;
  expect(() => sugify(grf, 2, layering)).toThrow(
    "custom layering 'layering' did not separate multi-graph children with an extra layer"
  );
});

test("sugify() throws for invalid layers", () => {
  const grf = graph<undefined, undefined>();
  const node = grf.node();
  node.y = -1;
  expect(() => sugify(grf, 1, layering)).toThrow(
    "custom layering 'layering' assigned node an invalid layer: -1"
  );
  node.y = 1;
  expect(() => sugify(grf, 1, layering)).toThrow(
    "custom layering 'layering' assigned node an invalid layer: 1"
  );
});

test("sugify() throws for empty layers", () => {
  const grf = graph<undefined, undefined>();
  const node = grf.node();
  node.y = 0;
  expect(() => sugify(grf, 2, layering)).toThrow(
    "custom layering 'layering' didn't assign a node to every layer"
  );
});
