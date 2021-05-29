import {
  coordCenter,
  coordGreedy,
  coordQuad,
  coordTopological,
  dagConnect,
  dagHierarchy,
  dagStratify,
  decrossOpt,
  decrossTwoLayer,
  layeringCoffmanGraham,
  layeringLongestPath,
  layeringSimplex,
  layeringTopological,
  sugiyama,
  twolayerMean,
  twolayerMedian,
  twolayerOpt,
  zherebko
} from "../src";

test("can loosly call the api", () => {
  dagStratify()([{ id: "" }]);
  dagHierarchy()({});
  const dag = dagConnect()([["a", "b"]]);
  const decross = decrossTwoLayer()
    .order(twolayerOpt())
    .order(twolayerMean())
    .order(twolayerMedian());
  const layout = sugiyama()
    .layering(layeringTopological())
    .layering(layeringCoffmanGraham())
    .layering(layeringLongestPath())
    .layering(layeringSimplex())
    .decross(decrossOpt())
    .decross(decross)
    .coord(coordTopological())
    .coord(coordGreedy())
    .coord(coordCenter())
    .coord(coordQuad());
  const { width, height } = layout(dag);
  expect(width).toBeGreaterThanOrEqual(0);
  expect(height).toBeGreaterThanOrEqual(0);
  zherebko()(dag);
});
