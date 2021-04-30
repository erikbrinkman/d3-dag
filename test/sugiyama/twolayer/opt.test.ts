import { createLayers, crossings } from "../utils";

import { twolayerOpt } from "../../../src";

test("twolayerOpt() allows setting large", () => {
  const layering = twolayerOpt().large("large");
  expect(layering.large()).toEqual("large");
});

test("twolayerOpt() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerOpt()(topLayer, bottomLayer);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0]);
});

test("twolayerOpt() works where mean fails", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]]
  ]);
  bottomLayer.reverse();
  twolayerOpt()(topLayer, bottomLayer);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(4);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([4, 0, 1, 2, 3]);
});

test("twolayerOpt() works where median is suboptimal", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]]
  ]);
  twolayerOpt()(topLayer, bottomLayer);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(6);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([3, 2, 0, 1]);
});

test("twolayerOpt() fails for large inputs", () => {
  const [topLayer, bottomLayer] = createLayers([[[...Array(51).keys()]]]);
  expect(() => twolayerOpt()(topLayer, bottomLayer)).toThrow(`"large"`);
});

test("twolayerOpt() fails for medium inputs", () => {
  const [topLayer, bottomLayer] = createLayers([[[...Array(31).keys()]]]);
  expect(() => twolayerOpt()(topLayer, bottomLayer)).toThrow(`"medium"`);
});

test("twolayerOpt() fails passing an arg to constructor", () => {
  // @ts-expect-error opt doesn't take arguments
  expect(() => twolayerOpt(undefined)).toThrow("got arguments to opt");
});
