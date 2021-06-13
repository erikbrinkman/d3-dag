import { SugiNode, sugify } from "../../src/sugiyama/utils";
import { assert, bigrams, def } from "../../src/utils";

import { Dag } from "../../src/dag";
import { hierarchy } from "../../src/dag/create";

export function getLayers(dag: Dag<{ id: string }>): number[][] {
  const layers: number[][] = [];
  for (const node of dag) {
    const layerId = def(node.value);
    const layer = layers[layerId] || (layers[layerId] = []);
    layer.push(parseInt(node.data.id));
  }
  for (const [i, layer] of layers.entries()) {
    if (!layer || !layer.length) {
      throw new Error(`layer ${i} was empty`);
    }
  }
  return layers.map((layer) => layer.sort((a, b) => a - b));
}

/**
 * Arrange an array based off the indices of its elements. This is loosely a
 * very simple inplace radix sort. It uses an O(n) additional cache to avoid
 * calling `ind` more than once per element.
 */
function arrange<T>(array: T[], ind: (elem: T) => number): T[] {
  const assigned: (true | undefined)[] = new Array(array.length);
  for (let i = 0; i < array.length; ) {
    if (assigned[i]) {
      i++;
    } else {
      const swap = ind(array[i]);
      assert(!assigned[swap]);
      [array[i], array[swap]] = [array[swap], array[i]];
      assigned[swap] = true;
    }
  }
  return array;
}

export interface TestDatum {
  layer: number;
  index: number;
}

/** get the index of a TestDatum node */
export function getIndex(
  node: SugiNode<{ index: number }>
): number | undefined {
  return "node" in node.data ? node.data.node.data.index : undefined;
}

/** create layers for test dag */
export function createLayers(
  children: (number[] | number)[][]
): SugiNode<TestDatum>[][] {
  // easy checks
  assert(children.length);
  for (const first of children[0]) {
    assert(typeof first !== "number");
  }
  for (const last of children[children.length - 1]) {
    assert(typeof last !== "number" && !last.length);
  }

  // look up data by key, allowing for uniqueness
  const data = new Map<string, TestDatum>();
  for (const [layer, childs] of children.entries()) {
    for (const [index, node] of childs.entries()) {
      if (typeof node !== "number") {
        data.set([layer, index].join(","), { layer, index });
      }
    }
  }

  // NOTE by creating the dag we lose information about the "index" of dummy
  // nodes, however dummy nodes are uniquely identified by the source, target,
  // and layer, so we use that as a key to look up the index
  const dummyInds = children.map(() => new Map<string, number>());

  function childrenAccessor(datum: TestDatum): TestDatum[] {
    const vals = children[datum.layer][datum.index];
    assert(vals !== undefined && typeof vals !== "number");
    return [...new Set(vals)].map((ind) => {
      let layer = datum.layer + 1;
      let next;
      const dummies: number[] = [];
      while (typeof (next = children[layer][ind]) === "number") {
        dummies.push(ind);
        ind = next;
        layer++;
      }
      assert(next !== undefined);

      // store dummy indicies
      for (const [i, index] of dummies.entries()) {
        const dinds = dummyInds[datum.layer + i + 1];
        const key = [datum.layer, datum.index, layer, ind].join(",");
        assert(!dinds.has(key));
        dinds.set(key, index);
      }
      return def(data.get([layer, ind].join(",")));
    });
  }

  // turn into a normal dag
  const create = hierarchy().roots(false).children(childrenAccessor);
  const raw = create(...data.values());

  // assign layer
  for (const node of raw) {
    node.value = node.data.layer;
  }
  const layers = sugify(raw);

  // rearrange layers so they're consistent with input
  for (const [i, layer] of layers.entries()) {
    const dinds = dummyInds[i];
    arrange(layer, (node) => {
      if ("node" in node.data) {
        return node.data.node.data.index;
      } else {
        const { source, target } = node.data;
        const key = [
          source.data.layer,
          source.data.index,
          target.data.layer,
          target.data.index
        ].join(",");
        return def(dinds.get(key));
      }
    });
  }

  return layers;
}

export const sugiNodeSize = () => [1, 1] as const;
export const nodeSize = () => 1 as const;

export function crossings(layers: readonly (readonly SugiNode[])[]): number {
  let crossings = 0;
  for (const [topLayer, bottomLayer] of bigrams(layers)) {
    const inds = new Map(bottomLayer.map((node, j) => [node, j] as const));
    for (const [j, p1] of topLayer.entries()) {
      for (const p2 of topLayer.slice(j + 1)) {
        for (const c1 of p1.ichildren()) {
          for (const c2 of p2.ichildren()) {
            if (c1 !== c2 && def(inds.get(c1)) > def(inds.get(c2))) {
              crossings++;
            }
          }
        }
      }
    }
  }
  return crossings;
}
