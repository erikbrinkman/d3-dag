import { createLayers, crossings } from "../utils";

import { twolayerOpt } from "../../../src";

test("twolayerOpt() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerOpt()(topLayer, bottomLayer);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,1", "1,0"]);
});

test("twolayerOpt() works for debug", () => {
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  const twolayer = twolayerOpt().debug(true).clowntown(true);
  expect(twolayer.debug()).toBeTruthy();
  expect(twolayer.clowntown()).toBeTruthy();
  twolayer(topLayer, bottomLayer);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,1", "1,0"]);
});

test("twolayerOpt() works where mean fails", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]]
  ]);
  bottomLayer.reverse();
  twolayerOpt()(topLayer, bottomLayer);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(4);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,4", "1,0", "1,1", "1,2", "1,3"]);
});

test("twolayerOpt() works where median is suboptimal", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]]
  ]);
  twolayerOpt()(topLayer, bottomLayer);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(6);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,3", "1,2", "1,0", "1,1"]);
});

test("twolayerOpt() fails for large inputs", () => {
  const [topLayer, bottomLayer] = createLayers([[[...Array(51).keys()]]]);
  expect(() => twolayerOpt()(topLayer, bottomLayer)).toThrow("clowntown");
});

test("twolayerOpt() fails passing an arg to constructor", () => {
  // @ts-expect-error opt doesn't take arguments
  expect(() => twolayerOpt(undefined)).toThrow("got arguments to opt");
});
