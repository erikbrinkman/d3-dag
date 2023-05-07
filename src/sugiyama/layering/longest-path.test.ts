import { Layering, layerSeparation } from ".";
import { graphConnect } from "../../graph/connect";
import { ccoz, eye, multi, oh, square } from "../../test-graphs";
import { canonical, getLayers } from "../test-utils";
import { layeringLongestPath } from "./longest-path";
import { sizedSep } from "./test-utils";

const changes = [
  ["0", "0"],
  ["1", "2"],
] as const;

test("layeringLongestPath() works for square", () => {
  const dag = square();
  const layering = layeringLongestPath();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("layeringLongestPath() works for square with sizedSep", () => {
  const dag = square();
  const layering = layeringLongestPath();
  const height = layering(dag, sizedSep);
  expect(height).toBeCloseTo(7);
  const [zero, one, two, three] = canonical(dag);
  expect(zero.y).toBeCloseTo(0.5);
  expect(one.y).toBeCloseTo(3);
  expect(two.y).toBeCloseTo(3.5);
  expect(three.y).toBeCloseTo(6.5);
});

test("layeringLongestPath() works for square with sizedSep bottom up", () => {
  const dag = square();
  const layering = layeringLongestPath().topDown(false);
  const height = layering(dag, sizedSep);
  expect(height).toBeCloseTo(7);
  const [zero, one, two, three] = canonical(dag);
  expect(zero.y).toBeCloseTo(0.5);
  expect(one.y).toBeCloseTo(4);
  expect(two.y).toBeCloseTo(3.5);
  expect(three.y).toBeCloseTo(6.5);
});

test("layeringLongestPath() works for disconnected graph", () => {
  const dag = ccoz();
  const layering = layeringLongestPath();
  const num = layering(dag, layerSeparation);
  const layers = getLayers(dag, num + 1);
  expect(layers.length).toBeTruthy();
});

test("layeringLongestPath() works for disconnected graph with sizedSep", () => {
  const dag = ccoz();
  const layering = layeringLongestPath();
  const height = layering(dag, sizedSep);
  expect(height).toBeCloseTo(7);
});

test("layeringLongestPath() works for cyclic graph", () => {
  const dag = oh();
  const layering = layeringLongestPath();
  const num = layering(dag, layerSeparation);
  const layers = getLayers(dag, num + 1);
  expect([
    [[0], [1]],
    [[1], [0]],
  ]).toContainEqual(layers);
});

test("layeringLongestPath() works for rank", () => {
  function rank({ data }: { data: string }): number {
    return -parseInt(data);
  }

  const dag = square();
  const base = layeringLongestPath() satisfies Layering<unknown, unknown>;
  const layering = base.rank(rank) satisfies Layering<string, unknown>;
  // @ts-expect-error no longer general
  layering satisfies Layering<unknown, unknown>;
  expect(layering.rank() satisfies typeof rank).toBe(rank);

  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[3], [1, 2], [0]]).toEqual(layers);
});

test("layeringLongestPath() works for topDown", () => {
  const create = graphConnect().single(true);
  const dag = create(changes);
  const layering = layeringLongestPath();
  expect(layering.topDown()).toBeTruthy();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect([[1], [0, 2]]).toEqual(layers);
});

test("layeringLongestPath() works for bottomUp", () => {
  const create = graphConnect().single(true);
  const dag = create(changes);
  const layering = layeringLongestPath().topDown(false);
  expect(layering.topDown()).toBeFalsy();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect([[0, 1], [2]]).toEqual(layers);
});

test("layeringLongestPath() compacts long edges", () => {
  const builder = graphConnect();
  const dag = builder([
    ["0", "1"],
    ["0", "2"],
    ["2", "3"],
    ["4", "3"],
  ]);
  const layering = layeringLongestPath();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1, 2, 4], [3]]).toEqual(layers);
});

test("layeringLongestPath() compacts multiple long edges", () => {
  const builder = graphConnect();
  const dag = builder([
    ["0", "1"],
    ["1", "2"],
    ["0", "3"],
    ["3", "4"],
    ["4", "5"],
    ["6", "5"],
    ["7", "6"],
  ]);
  const layering = layeringLongestPath();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(3);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1, 3, 7], [2, 4, 6], [5]]).toEqual(layers);
});

test("layeringLongestPath() works for multi dag", () => {
  const dag = multi();
  const layering = layeringLongestPath();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1]]).toEqual(layers);
});

test("layeringLongestPath() works for multi dag bottom up", () => {
  const dag = multi();
  const layering = layeringLongestPath().topDown(false);
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1]]).toEqual(layers);
});

test("layeringLongestPath() works for eye multi dag", () => {
  const dag = eye();
  const layering = layeringLongestPath();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("layeringLongestPath() works for eye multi dag bottom up", () => {
  const dag = eye();
  const layering = layeringLongestPath().topDown(false);
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("layeringLongestPath() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => layeringLongestPath(null)).toThrow(
    "got arguments to layeringLongestPath"
  );
});
