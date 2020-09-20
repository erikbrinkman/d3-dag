import { createLayers, sep } from "../utils";

import { coordSingleLayer } from "../../../src/sugiyama/coord/utils";

test("coordSingleLayer() works for two nodes", () => {
  const [layer] = createLayers([[[], []]]);
  coordSingleLayer(layer, sep);
  const [first, second] = layer;
  expect(first.x).toEqual(0);
  expect(second.x).toEqual(1);
});

test("coordSingleLayer() respects sep", () => {
  const [layer] = createLayers([[[], [], []]]);
  coordSingleLayer(layer, (l, r) => +l.id.split(",")[1] + +r.id.split(",")[1]);
  const [first, second, third] = layer;
  expect(first.x).toEqual(0);
  expect(second.x).toBeCloseTo(0.25);
  expect(third.x).toEqual(1);
});

test("coordSingleLayer() works with zero separation", () => {
  const [layer] = createLayers([[[], []]]);
  coordSingleLayer(layer, () => 0);
  const [first, second] = layer;
  expect(first.x).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(0.5);
});
