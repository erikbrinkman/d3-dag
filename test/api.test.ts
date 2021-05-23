import {
  SugiDummyNode,
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
  layout(dag);
  zherebko()(dag);
  expect(new SugiDummyNode().data).toBeUndefined();
});
