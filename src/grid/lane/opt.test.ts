import { expect, test } from "bun:test";
import { graphConnect } from "../../graph/connect";
import { doub, dummy, line, single, zhere } from "../../test-graphs";
import { laneOpt } from "./opt";
import { crossings, hard, prepare } from "./test-utils";

test("laneOpt() works for single", () => {
  const nodes = prepare(single());
  for (const compressed of [false, true]) {
    for (const dist of [false, true]) {
      for (const check of ["fast", "slow", "oom"] as const) {
        const layout = laneOpt().compressed(compressed).dist(dist).check(check);
        layout(nodes);
        expect(nodes.map((node) => node.x)).toEqual([0]);
        expect(crossings(nodes)).toEqual(0);
      }
    }
  }
});

test("laneOpt() works for line", () => {
  const nodes = prepare(line());
  for (const compressed of [false, true]) {
    for (const dist of [false, true]) {
      const layout = laneOpt().compressed(compressed).dist(dist);
      layout(nodes);
      expect(nodes.map((node) => node.x)).toEqual([0, 0]);
      expect(crossings(nodes)).toEqual(0);
    }
  }
});

test("laneOpt() works for double unconnected", () => {
  const nodes = prepare(doub());
  for (const compressed of [false, true]) {
    for (const dist of [false, true]) {
      const layout = laneOpt().compressed(compressed).dist(dist);
      layout(nodes);
      expect(nodes.map((node) => node.x)).toEqual([0, 0]);
      expect(crossings(nodes)).toEqual(0);
    }
  }
});

test("laneOpt() works for triangle", () => {
  const nodes = prepare(dummy());
  const layout = laneOpt();
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 1, 0]);
  expect(crossings(nodes)).toEqual(0);
});

test("laneOpt() works when crossings are unavoidable", () => {
  const nodes = prepare(zhere());
  const layout = laneOpt();
  layout(nodes);
  expect(crossings(nodes)).toEqual(2);
});

test("laneOpt() works where greedy fails", () => {
  // all greedy assignment of this produce two crossings
  const nodes = prepare(hard());
  const layout = laneOpt();
  layout(nodes);
  expect(crossings(nodes)).toEqual(0);
});

test("laneOpt() works for compressed", () => {
  // we can reduce the width by allowing a crossing
  const create = graphConnect();
  const dag = create([
    ["0", "1"],
    ["0", "2"],
    ["0", "5"],
    ["0", "6"],
    ["1", "5"],
    ["1", "6"],
    ["2", "3"],
    ["2", "4"],
  ]);
  const nodes = prepare(dag);

  const layout = laneOpt();
  expect(layout.compressed()).toBe(false);
  layout(nodes);
  expect(crossings(nodes)).toEqual(0);
  expect(Math.max(...nodes.map((node) => node.x))).toEqual(4);

  const comp = layout.compressed(true);
  expect(comp.compressed()).toBe(true);
  comp(nodes);
  expect(Math.max(...nodes.map((node) => node.x))).toEqual(3);
  expect(crossings(nodes)).toEqual(1);
});

test("laneOpt() works for compressed edge case", () => {
  // he we need to test compression for a specific graph where a node without
  // parents is allowed to slot in
  const create = graphConnect();
  const dag = create([
    ["0", "1"],
    ["2", "3"],
  ]);
  const nodes = prepare(dag);

  const layout = laneOpt().compressed(true);
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 0, 0, 0]);
});

test("laneOpt() dist compacts slightly", () => {
  // This is a fragile test, because the minimum distance version will share
  // the same optima without it, but it's not likely, so we verify that's the
  // case
  const create = graphConnect();
  const dag = create([
    ["0", "1"],
    ["0", "2"],
    ["0", "5"],
    ["0", "6"],
    ["1", "6"],
    ["2", "3"],
    ["2", "4"],
  ]);
  const nodes = prepare(dag);

  const layout = laneOpt();
  expect(layout.dist()).toBe(true);
  layout(nodes);
  expect(crossings(nodes)).toEqual(0);
  expect(Math.max(...nodes.map((node) => node.x))).toEqual(3);

  const dist = layout.dist(false);
  expect(dist.dist()).toBe(false);
  dist(nodes);
  expect(crossings(nodes)).toEqual(0);
  expect(Math.max(...nodes.map((node) => node.x))).toBeGreaterThan(3);
});

test("laneOpt() throws for large graphs", () => {
  const create = graphConnect();
  const ids: [string, string][] = [];
  for (let i = 0; i < 18; ++i) {
    for (let j = 0; j < i; ++j) {
      ids.push([`${j}`, `${i}`]);
    }
  }
  const dag = create(ids);
  const nodes = prepare(dag);

  const layout = laneOpt();
  expect(layout.check()).toBe("fast");
  expect(() => layout(nodes)).toThrow(`"slow"`);
});

test("laneOpt() throws for very large graphs", () => {
  const create = graphConnect();
  const ids: [string, string][] = [];
  for (let i = 0; i < 20; ++i) {
    for (let j = 0; j < i; ++j) {
      ids.push([`${j}`, `${i}`]);
    }
  }
  const dag = create(ids);
  const nodes = prepare(dag);

  const layout = laneOpt().check("slow");
  expect(layout.check()).toBe("slow");
  expect(() => layout(nodes)).toThrow(`"oom"`);
});

test("laneOpt() throws for arguments", () => {
  // @ts-expect-error no args
  expect(() => laneOpt(null)).toThrow("laneOpt");
});
