import { center } from "../../../src/sugiyama/coord/center";
import { greedy } from "../../../src/sugiyama/coord/greedy";
import { quad } from "../../../src/sugiyama/coord/quad";
import { SugiNode } from "../../../src/sugiyama/utils";
import { createLayers, nodeSize } from "../utils";

const square = () => createLayers([[[0], [1]], [[0], [0]], [[]]]);
const ccoz = () => createLayers([[[0, 1], [2], [3]], [[0], [0], [], []], [[]]]);
const dtopo = () => createLayers([[[0, 1]], [[], 0], [[]], [[0]], [[]]]);
const doub = () => createLayers([[[0], []], [[]]]);
const vee = () => createLayers([[[0], [0]], [[]]]);
const ex = () =>
  createLayers([
    [[1], [0]],
    [[], []]
  ]);

function idLayerSize(node: SugiNode<{ index: number }>): number {
  return "node" in node.data ? node.data.node.data.index + 1 : 1;
}

for (const method of [center(), greedy(), quad()]) {
  for (const dat of [square, ccoz, dtopo, doub, vee, ex]) {
    test(`invariants apply to ${dat.name} assigned by ${method.name}`, () => {
      const layered = dat();
      const width = method(layered, nodeSize);
      for (const layer of layered) {
        for (const node of layer) {
          expect(node.x).toBeGreaterThanOrEqual(0);
          expect(node.x).toBeLessThanOrEqual(width);
        }
      }
    });
  }

  test(`single layer respects node width by ${method.name}`, () => {
    const [layer] = createLayers([[[], [], []]]);
    const width = method([layer], idLayerSize);
    expect(width).toBeCloseTo(6);
    const [first, second, third] = layer;
    expect(first.x).toBeCloseTo(0.5);
    expect(second.x).toBeCloseTo(2);
    expect(third.x).toBeCloseTo(4.5);
  });
}
