import { layerSeparation } from ".";
import { GraphNode } from "../../graph";
import { graphConnect as connect } from "../../graph/connect";
import { doub, ex, eye, multi, oh, square } from "../../test-graphs";
import { getLayers } from "../test-utils";
import { layeringSimplex as simplex } from "./simplex";

test("simplex() works for square", () => {
  const dag = square();
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect(layers).toEqual([[0], [1, 2], [3]]);
});

test("simplex() works for known failure", () => {
  const create = connect();
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
  const nodes = [...dag].sort(
    ([a], [b]) => parseInt(a.data) - parseInt(b.data)
  );
  for (const [i, node] of nodes.entries()) {
    expect(node.y).toBeCloseTo(i < 5 ? i : 3);
  }
});

test("simplex() respects ranks and gets them", () => {
  const dag = square();
  function ranker(node: GraphNode<string>): undefined | number {
    if (node.data === "1") {
      return 1;
    } else if (node.data === "2") {
      return 2;
    } else {
      return undefined;
    }
  }
  const layering = simplex().rank(ranker);
  expect(layering.rank()).toBe(ranker);
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
    node.data === "0" || node.data === "2" ? 0 : undefined
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

test("simplex() works for multi dag", () => {
  const dag = multi();
  const layering = simplex();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [], [1]]).toEqual(layers);
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
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([
    [[0], [], [1]],
    [[1], [], [0]],
  ]).toContainEqual(layers);
});

test("simplex() fails passing an arg to constructor", () => {
  expect(() => simplex(null as never)).toThrow(
    "got arguments to layeringSimplex"
  );
});

test("simplex() fails with ill-defined groups", () => {
  const dag = square();
  const layout = simplex().group((node: GraphNode<string>) => {
    return node.data === "0" || node.data === "1" ? "" : undefined;
  });
  expect(() => layout(dag, layerSeparation)).toThrow(
    "could not find a feasible simplex layout"
  );
});

test("simplex() fails with ill-defined group", () => {
  const dag = square();
  const layout = simplex().group((node: GraphNode<string>) =>
    node.data === "0" || node.data === "3" ? "group" : undefined
  );
  expect(() => layout(dag, layerSeparation)).toThrow(
    "could not find a feasible simplex layout"
  );
});
