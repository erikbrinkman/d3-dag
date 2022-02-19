import { connect } from "../../../src/dag/create";
import { opt } from "../../../src/grid/lane/opt";
import { dummy, zhere } from "../../examples";
import { crossings, hard, prepare } from "./utils";

test("opt() works for triangle", () => {
  const nodes = prepare(dummy());
  const layout = opt();
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 1, 0]);
  expect(crossings(nodes)).toEqual(0);
});

test("opt() works when crossings are unavoidable", () => {
  const nodes = prepare(zhere());
  const layout = opt();
  layout(nodes);
  expect(crossings(nodes)).toEqual(2);
});

test("opt() works where greedy fails", () => {
  // all greedy assignment of this produce two crossings
  const nodes = prepare(hard());
  const layout = opt();
  layout(nodes);
  expect(crossings(nodes)).toEqual(0);
});

test("opt() works for compressed", () => {
  // we can reduce the width by allowing a crossing
  const create = connect();
  const dag = create([
    ["0", "1"],
    ["0", "2"],
    ["0", "5"],
    ["0", "6"],
    ["1", "5"],
    ["1", "6"],
    ["2", "3"],
    ["2", "4"]
  ]);
  const nodes = prepare(dag);

  const layout = opt();
  expect(layout.compressed()).toBe(false);
  layout(nodes);
  expect(crossings(nodes)).toEqual(0);
  expect(Math.max(...nodes.map((n) => n.x!))).toEqual(4);

  const comp = layout.compressed(true);
  expect(comp.compressed()).toBe(true);
  comp(nodes);
  expect(Math.max(...nodes.map((n) => n.x!))).toEqual(3);
  expect(crossings(nodes)).toEqual(1);
});

test("opt() works for compressed edge case", () => {
  // he we need to test compression for a specific graph where a node without
  // parents is allowed to slot in
  const create = connect();
  const dag = create([
    ["0", "1"],
    ["2", "3"]
  ]);
  const nodes = prepare(dag);

  const layout = opt().compressed(true);
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 0, 0, 0]);
});

test("opt() dist compacts slightly", () => {
  // This is a fragile test, because the minimum distance version will share
  // the same optima without it, but it's not likely, so we verify that's the
  // case
  const create = connect();
  const dag = create([
    ["0", "1"],
    ["0", "2"],
    ["0", "5"],
    ["0", "6"],
    ["1", "6"],
    ["2", "3"],
    ["2", "4"]
  ]);
  const nodes = prepare(dag);

  const layout = opt();
  expect(layout.dist()).toBe(true);
  layout(nodes);
  expect(crossings(nodes)).toEqual(0);
  expect(Math.max(...nodes.map((n) => n.x!))).toEqual(3);

  const dist = layout.dist(false);
  expect(dist.dist()).toBe(false);
  dist(nodes);
  expect(crossings(nodes)).toEqual(0);
  expect(Math.max(...nodes.map((n) => n.x!))).toBeGreaterThan(3);
});

test("opt() throws for arguments", () => {
  expect(() => opt(undefined as never)).toThrow("opt");
});
