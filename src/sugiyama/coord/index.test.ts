import { GraphNode } from "../../graph";
import { bigrams } from "../../iters";
import { sugiNodeLength } from "../sugify";
import { createLayers, nodeSep } from "../test-utils";
import { sizedSeparation } from "../utils";
import { coordCenter } from "./center";
import { coordGreedy } from "./greedy";
import { coordQuad } from "./quad";
import { coordSimplex } from "./simplex";

const square = () => createLayers([[[0], [1]], [[0], [0]], [[]]]);
const ccoz = () => createLayers([[[0, 1], [2], [3]], [[0], [0], [], []], [[]]]);
const dtopo = () => createLayers([[[0, 1]], [[], 0], [[]], [[0]], [[]]]);
const doub = () => createLayers([[[0], []], [[]]]);
const vee = () => createLayers([[[0], [0]], [[]]]);
const ex = () =>
  createLayers([
    [[1], [0]],
    [[], []],
  ]);
const compact = () =>
  createLayers([
    [[1], [0], 2n, [3]],
    [[], [], [], []],
  ]);

const indexLength = (node: GraphNode<{ index: number }>): number =>
  node.data.index + 1;
const idLayerSep = sizedSeparation(sugiNodeLength(indexLength, 1), 0);

for (const [name, method] of [
  ["greedy", coordGreedy()],
  ["quad", coordQuad()],
  ["simplex", coordSimplex()],
  ["center", coordCenter()],
] as const) {
  for (const dat of [square, ccoz, dtopo, doub, vee, ex, compact]) {
    test(`invariants apply to ${dat.name} assigned by ${name}`, () => {
      const layered = dat();

      // test gaps as width
      const width = method(layered, nodeSep);
      for (const layer of layered) {
        for (const node of layer) {
          expect(node.x).toBeGreaterThanOrEqual(0);
          expect(node.x).toBeLessThanOrEqual(width);
        }
        for (const [first, second] of bigrams(layer)) {
          expect(second.x - first.x).toBeGreaterThanOrEqual(
            nodeSep(first, second) - 1e-3
          );
        }
      }

      // can reapply
      method(layered, nodeSep);
    });
  }

  test(`single layer respects node width by ${name}`, () => {
    const [layer] = createLayers([[[], [], []]]);
    const width = method([layer], idLayerSep);
    expect(width).toBeCloseTo(6);
    const [first, second, third] = layer;
    expect(first.x).toBeCloseTo(0.5);
    expect(second.x).toBeCloseTo(2);
    expect(third.x).toBeCloseTo(4.5);
  });
}
