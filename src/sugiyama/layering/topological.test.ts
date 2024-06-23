import { expect, test } from "bun:test";
import { Layering, layerSeparation } from ".";
import { doub, eye, multi, oh, square } from "../../test-graphs";
import { canonical, getLayers } from "../test-utils";
import { sizedSep } from "./test-utils";
import { layeringTopological } from "./topological";

test("layeringTopological() works for square", () => {
  const dag = square();
  const layering = layeringTopological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(3);
  const layers = getLayers(dag, num + 1);
  expect([
    [[0], [1], [2], [3]],
    [[0], [2], [1], [3]],
  ]).toContainEqual(layers);
});

test("layeringTopological() works for square with sizedSep", () => {
  const dag = square();
  const layering = layeringTopological();
  const height = layering(dag, sizedSep);
  expect(height).toBeCloseTo(10);
  // NOTE 1 & 2 could flip
  const [zero, one, two, three] = canonical(dag);
  expect(zero.y).toBeCloseTo(0.5);
  expect(one.y).toBeCloseTo(3);
  expect(two.y).toBeCloseTo(6.5);
  expect(three.y).toBeCloseTo(9.5);
});

test("layeringTopological() allows setting rank", () => {
  const dag = square();
  const rank = ({ data }: { data: string }) => -parseInt(data);

  const init = layeringTopological() satisfies Layering<unknown, unknown>;

  const layering = init.rank(rank) satisfies Layering<string, unknown>;
  // @ts-expect-error invalid data
  layering satisfies Layering<unknown, unknown>;

  expect(layering.rank() satisfies typeof rank).toBe(rank);

  const num = layering(dag, layerSeparation);
  expect(num).toBe(3);
  const layers = getLayers(dag, num + 1);
  expect([
    [[3], [2], [1], [0]],
    [[3], [1], [2], [0]],
  ]).toContainEqual(layers);
});

test("layeringTopological() works for disconnected graph", () => {
  const dag = doub();
  const layering = layeringTopological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  // NOTE implementation dependent
  expect(layers).toEqual([[0], [1]]);
});

test("layeringTopological() works for disconnected graph with sizedSep", () => {
  const dag = doub();
  const layering = layeringTopological();
  const height = layering(dag, sizedSep);
  expect(height).toBe(4);
});

test("layeringTopological() works for multi graph", () => {
  const dag = multi();
  const layering = layeringTopological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect(layers).toEqual([[0], [1]]);
});

test("layeringTopological() works for eye multi graph", () => {
  const dag = eye();
  const layering = layeringTopological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("layeringTopological() works for cyclic graph", () => {
  const dag = oh();
  const layering = layeringTopological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  // NOTE implementation dependent
  expect([
    [[0], [1]],
    [[1], [0]],
  ]).toContainEqual(layers);
});

test("layeringTopological() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => layeringTopological(null)).toThrow(
    "got arguments to layeringTopological",
  );
});
