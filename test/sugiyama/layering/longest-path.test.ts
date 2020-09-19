import { dagStratify, layeringLongestPath } from "../../../src";

import { square } from "../../examples";
import { toLayers } from "../utils";

const changes = [{ id: "0" }, { id: "1" }, { id: "2", parentIds: ["1"] }];

test("layeringLongestPath() works for square", () => {
  const dag = square();
  layeringLongestPath()(dag);
  const layers = toLayers(dag);
  expect([[0], [1, 2], [3]]).toEqual(layers);
});

test("layeringLongestPath() works for topDown", () => {
  const dag = dagStratify()(changes);
  const layering = layeringLongestPath();
  expect(layering.topDown()).toBeTruthy();
  layering(dag);
  const layers = toLayers(dag);
  expect([[0, 1], [2]]).toEqual(layers);
});

test("layeringLongestPath() works for bottomUp", () => {
  const dag = dagStratify()(changes);
  const layering = layeringLongestPath().topDown(false);
  expect(layering.topDown()).toBeFalsy();
  layering(dag);
  const layers = toLayers(dag);
  expect([[1], [0, 2]]).toEqual(layers);
});

test("layeringLongestPath() fails passing an arg to constructor", () => {
  const willFail = (layeringLongestPath as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to longestPath");
});
