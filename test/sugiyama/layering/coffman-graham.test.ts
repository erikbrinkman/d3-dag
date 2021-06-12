import { ccoz, square } from "../../examples";

import { coffmanGraham } from "../../../src/sugiyama/layering/coffman-graham";
import { connect } from "../../../src/dag/create";
import { getLayers } from "../utils";

test("coffmanGraham() works for square", () => {
  const dag = square();
  coffmanGraham()(dag);
  const layers = getLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("coffmanGraham() works for a disconnected graph", () => {
  const dag = ccoz();
  coffmanGraham()(dag);
  const layers = getLayers(dag);
  expect(layers.length).toBeTruthy();
});

test("coffmanGraham() handles width", () => {
  const dag = square();
  const layering = coffmanGraham().width(1);
  expect(layering.width()).toBe(1);
  layering(dag);
  const layers = getLayers(dag);
  expect([
    [[0], [1], [2], [3]],
    [[0], [2], [1], [3]]
  ]).toContainEqual(layers);
});

test("coffmanGraham() handles earlier nodes", () => {
  const dag = connect()([
    ["0", "1"],
    ["1", "2"],
    ["0", "3"],
    ["2", "3"],
    ["1", "4"],
    ["2", "4"]
  ]);
  coffmanGraham().width(1)(dag);
  const layers = getLayers(dag);
  expect([[0], [1], [2], [3], [4]]).toEqual(layers);
});

test("coffmanGraham() handles shorter edges", () => {
  const dag = connect()([
    ["0", "1"],
    ["1", "2"],
    ["0", "3"],
    ["1", "3"],
    ["0", "4"],
    ["1", "4"],
    ["2", "4"]
  ]);
  coffmanGraham().width(1)(dag);
  const layers = getLayers(dag);
  expect([[0], [1], [2], [3], [4]]).toEqual(layers);
});

test("coffmanGraham() handles history reverse", () => {
  // priority queue handles nodes in certain orders, so we reverse to get
  // opposite comparison
  const dag = connect()([
    ["0", "1"],
    ["1", "2"],
    ["1", "4"],
    ["2", "4"],
    ["0", "3"],
    ["2", "3"]
  ]);
  coffmanGraham().width(1)(dag);
  const layers = getLayers(dag);
  expect([[0], [1], [2], [3], [4]]).toEqual(layers);
});

test("coffmanGraham() requires positive width", () => {
  expect(() => coffmanGraham().width(-1)).toThrow("width must be non-negative");
});

test("coffmanGraham() fails passing an arg to constructor", () => {
  expect(() => coffmanGraham(null as never)).toThrow(
    "got arguments to coffmanGraham"
  );
});
