import { ccoz, square } from "../../examples";
import { dagConnect, layeringCoffmanGraham } from "../../../src";

import { toLayers } from "../utils";

test("layeringCoffmanGraham() works for square", () => {
  const dag = square();
  layeringCoffmanGraham()(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("layeringCoffmanGraham() works for a disconnected graph", () => {
  const dag = ccoz();
  layeringCoffmanGraham()(dag);
  const layers = toLayers(dag);
  expect(layers.length).toBeTruthy();
});

test("layeringCoffmanGraham() handles width", () => {
  const dag = square();
  const layering = layeringCoffmanGraham().width(1);
  expect(layering.width()).toBe(1);
  layering(dag);
  const layers = toLayers(dag);
  expect([
    [[0], [1], [2], [3]],
    [[0], [2], [1], [3]]
  ]).toContainEqual(layers);
});

test("layeringCoffmanGraham() handles earlier nodes", () => {
  const dag = dagConnect()([
    ["0", "1"],
    ["1", "2"],
    ["0", "3"],
    ["2", "3"],
    ["1", "4"],
    ["2", "4"]
  ]);
  layeringCoffmanGraham().width(1)(dag);
  const layers = toLayers(dag);
  expect([[0], [1], [2], [3], [4]]).toEqual(layers);
});

test("layeringCoffmanGraham() handles shorter edges", () => {
  const dag = dagConnect()([
    ["0", "1"],
    ["1", "2"],
    ["0", "3"],
    ["1", "3"],
    ["0", "4"],
    ["1", "4"],
    ["2", "4"]
  ]);
  layeringCoffmanGraham().width(1)(dag);
  const layers = toLayers(dag);
  expect([[0], [1], [2], [3], [4]]).toEqual(layers);
});

test("layeringCoffmanGraham() handles history reverse", () => {
  // priority queue handles nodes in certain orders, so we reverse to get
  // opposite comparison
  const dag = dagConnect()([
    ["0", "1"],
    ["1", "2"],
    ["1", "4"],
    ["2", "4"],
    ["0", "3"],
    ["2", "3"]
  ]);
  layeringCoffmanGraham().width(1)(dag);
  const layers = toLayers(dag);
  expect([[0], [1], [2], [3], [4]]).toEqual(layers);
});

test("layeringCoffmanGraham() requires positive width", () => {
  expect(() => layeringCoffmanGraham().width(-1)).toThrow(
    "width must be non-negative"
  );
});

test("layeringCoffmanGraham() fails passing an arg to constructor", () => {
  // @ts-expect-error coffman-graham takes no arguments
  expect(() => layeringCoffmanGraham(undefined)).toThrow(
    "got arguments to coffmanGraham"
  );
});
