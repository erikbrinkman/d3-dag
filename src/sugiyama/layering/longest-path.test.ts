import { layerSeparation } from ".";
import { graphConnect } from "../../graph/connect";
import { ccoz, eye, multi, oh, square } from "../../test-graphs";
import { getLayers } from "../test-utils";
import { layeringLongestPath as longestPath } from "./longest-path";

const changes = [
  ["0", "0"],
  ["1", "2"],
] as const;

test("longestPath() works for square", () => {
  const dag = square();
  const layering = longestPath();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("longestPath() works for disconnected graph", () => {
  const dag = ccoz();
  const layering = longestPath();
  const num = layering(dag, layerSeparation);
  const layers = getLayers(dag, num + 1);
  expect(layers.length).toBeTruthy();
});

test("longestPath() works for cyclic graph", () => {
  const dag = oh();
  const layering = longestPath();
  const num = layering(dag, layerSeparation);
  const layers = getLayers(dag, num + 1);
  expect([
    [[0], [], [1]],
    [[1], [], [0]],
  ]).toContainEqual(layers);
});

test("longestPath() works for topDown", () => {
  const create = graphConnect().single(true);
  const dag = create(changes);
  const layering = longestPath();
  expect(layering.topDown()).toBeTruthy();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect([[0, 1], [2]]).toEqual(layers);
});

test("longestPath() works for bottomUp", () => {
  const create = graphConnect().single(true);
  const dag = create(changes);
  const layering = longestPath().topDown(false);
  expect(layering.topDown()).toBeFalsy();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  expect([[1], [0, 2]]).toEqual(layers);
});

test("longestPath() works for multi dag", () => {
  const dag = multi();
  const layering = longestPath();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [], [1]]).toEqual(layers);
});

test("longestPath() works for multi dag bottom up", () => {
  const dag = multi();
  const layering = longestPath().topDown(false);
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [], [1]]).toEqual(layers);
});

test("longestPath() works for eye multi dag", () => {
  const dag = eye();
  const layering = longestPath();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("longestPath() works for eye multi dag bottom up", () => {
  const dag = eye();
  const layering = longestPath().topDown(false);
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("longestPath() fails passing an arg to constructor", () => {
  expect(() => longestPath(null as never)).toThrow(
    "got arguments to layeringLongestPath"
  );
});
