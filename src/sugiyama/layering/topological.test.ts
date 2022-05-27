import { layerSeparation } from ".";
import { doub, eye, multi, oh, square } from "../../test-graphs";
import { getLayers } from "../test-utils";
import { layeringTopological as topological } from "./topological";

test("topological() works for square", () => {
  const dag = square();
  const layering = topological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(3);
  const layers = getLayers(dag, num + 1);
  expect([
    [[0], [1], [2], [3]],
    [[0], [2], [1], [3]],
  ]).toContainEqual(layers);
});

test("topological() allows setting rank", () => {
  const dag = square();
  const rank = ({ data }: { data: string }) => -parseInt(data);
  const layering = topological().rank(rank);
  expect(layering.rank()).toBe(rank);
  const num = layering(dag, layerSeparation);
  expect(num).toBe(3);
  const layers = getLayers(dag, num + 1);
  expect([
    [[3], [2], [1], [0]],
    [[3], [1], [2], [0]],
  ]).toContainEqual(layers);
});

test("topological() works for disconnected graph", () => {
  const dag = doub();
  const layering = topological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(1);
  const layers = getLayers(dag, num + 1);
  // NOTE implementation dependent
  expect(layers).toEqual([[0], [1]]);
});

test("topological() works for multi graph", () => {
  const dag = multi();
  const layering = topological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect(layers).toEqual([[0], [], [1]]);
});

test("topological() works for eye multi graph", () => {
  const dag = eye();
  const layering = topological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  expect([[0], [1], [2]]).toEqual(layers);
});

test("topological() works for cyclic graph", () => {
  const dag = oh();
  const layering = topological();
  const num = layering(dag, layerSeparation);
  expect(num).toBe(2);
  const layers = getLayers(dag, num + 1);
  // NOTE implementation dependent
  expect([
    [[0], [], [1]],
    [[1], [], [0]],
  ]).toContainEqual(layers);
});

test("topological() fails passing an arg to constructor", () => {
  expect(() => topological(null as never)).toThrow(
    "got arguments to layeringTopological"
  );
});
