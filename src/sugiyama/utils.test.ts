import { compactCrossings, createLayers } from "./test-utils";

test("compactCrossings() detects crossing", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[1], 0n],
    [[], []],
  ]);
  expect(compactCrossings(topLayer, bottomLayer)).toBeTruthy();
});
