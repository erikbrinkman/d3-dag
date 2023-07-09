import { Layering, layerSeparation } from ".";
import { GraphNode } from "../../graph";
import { graphConnect } from "../../graph/connect";
import { doub, ex, eye, multi, oh, square } from "../../test-graphs";
import { canonical, getLayers } from "../test-utils";
import { layeringSimplex as simplex } from "./simplex";
import { sizedSep } from "./test-utils";

test("simplex() works for square", () => {
  const dag = square();
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect(layers).toEqual([[0], [1, 2], [3]]);
});

test("simplex() works for square with sizedSep", () => {
  const dag = square();
  const layering = simplex();
  const height = layering(dag, sizedSep);
  expect(height).toBe(7);
  const [zero, one, two, three] = canonical(dag);
  expect(zero.y).toBeCloseTo(0.5);
  expect(one.y).toBeGreaterThanOrEqual(3);
  expect(one.y).toBeLessThanOrEqual(4);
  expect(two.y).toBeCloseTo(3.5);
  expect(three.y).toBeCloseTo(6.5);
});

test("simplex() works for known failure", () => {
  const create = graphConnect();
  const dag = create([
    ["0", "1"],
    ["1", "2"],
    ["2", "3"],
    ["3", "4"],
    ["5", "4"],
    ["6", "4"],
  ]);
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(4);
  const nodes = canonical(dag);
  for (const [i, node] of nodes.entries()) {
    expect(node.y).toBeCloseTo(i < 5 ? i : 3);
  }
});

test("simplex() respects ranks and gets them", () => {
  const dag = square();
  function ranker({ data }: { data: string }): undefined | number {
    if (data === "1") {
      return 1;
    } else if (data === "2") {
      return 2;
    } else {
      return undefined;
    }
  }

  function group(node: GraphNode<unknown, [string, string]>): undefined {
    for (const _ of node.childLinks()) {
      // noop
    }
    return undefined;
  }

  const init = simplex() satisfies Layering<unknown, unknown>;

  const grouped = init.group(group);
  grouped satisfies Layering<unknown, [string, string]>;
  // @ts-expect-error invalid data
  grouped satisfies Layering<unknown, unknown>;

  const layering = grouped.rank(ranker);
  layering satisfies Layering<string, [string, string]>;
  // @ts-expect-error invalid data
  layering satisfies Layering<unknown, [string, string]>;

  expect(layering.rank() satisfies typeof ranker).toBe(ranker);
  expect(layering.group() satisfies typeof group).toBe(group);

  const num = layering(dag, layerSeparation);
  expect(num).toBe(3);
  const layers = getLayers(dag, num + 1);
  expect(layers).toEqual([[0], [1], [2], [3]]);
});

test("simplex() works for X", () => {
  // NOTE longest path will always produce a dummy node, where simplex
  // will not
  const dag = ex();
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(4);
  const layers = getLayers(dag, num + 1);
  expect(layers).toEqual([[0], [1, 2], [3], [4, 5], [6]]);
});

test("simplex() respects equality rank", () => {
  const dag = ex();
  const layering = simplex().rank((node: GraphNode<string>) =>
    node.data === "0" || node.data === "2" ? 0 : undefined,
  );
  const num = layering(dag, layerSeparation);
  expect(num).toBe(4);
  const layers = getLayers(dag, num + 1);
  expect(layers).toEqual([[0, 2], [1], [3], [4, 5], [6]]);
});

test("simplex() respects groups", () => {
  const dag = ex();
  const grp = (node: GraphNode<string>) =>
    node.data === "0" || node.data === "2" ? "group" : undefined;
  const layering = simplex().group(grp);
  expect(layering.group()).toBe(grp);
  const num = layering(dag, layerSeparation);
  expect(num).toBe(4);
  const layers = getLayers(dag, num + 1);
  expect([[0, 2], [1], [3], [4, 5], [6]]).toEqual(layers);
});

test("simplex() works for disconnected dag", () => {
  const dag = doub();
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(0);
  const layers = getLayers(dag, num + 1);
  expect([[0, 1]]).toEqual(layers);
});

test("simplex() works for disconnected dag with sizedSep", () => {
  const dag = doub();
  const layering = simplex();
  const height = layering(dag, sizedSep);
  expect(height).toBeCloseTo(2);
});

test("simplex() works for multi dag", () => {
  const dag = multi();
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1]]).toEqual(layers);
});

test("simplex() works for eye multi dag", () => {
  const dag = eye();
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("simplex() works for oh", () => {
  const dag = oh();
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect([
    [[0], [1]],
    [[1], [0]],
  ]).toContainEqual(layers);
});

test("simplex() works for oh with sizedSep", () => {
  const dag = oh();
  const layering = simplex();
  const height = layering(dag, sizedSep);
  expect(height).toBe(4);
  const [zero, one] = canonical(dag);
  // NOTE could flip
  expect(zero.y).toBeCloseTo(3.5);
  expect(one.y).toBeCloseTo(1);
});

test("simplex() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => simplex(null)).toThrow("got arguments to layeringSimplex");
});

test("simplex() fails with ill-defined groups", () => {
  const dag = square();
  const layout = simplex().group((node: GraphNode<string>) => {
    return node.data === "0" || node.data === "1" ? "" : undefined;
  });
  expect(() => layout(dag, layerSeparation)).toThrow(
    "could not find a feasible simplex layout",
  );
});

test("simplex() fails with ill-defined group", () => {
  const dag = square();
  const layout = simplex().group((node: GraphNode<string>) =>
    node.data === "0" || node.data === "3" ? "group" : undefined,
  );
  expect(() => layout(dag, layerSeparation)).toThrow(
    "could not find a feasible simplex layout",
  );
});
