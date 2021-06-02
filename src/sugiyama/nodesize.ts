import { assert, js } from "../utils";

import { SugiNode } from "./utils";
import { SugiNodeSizeAccessor } from "./coord";

/**
 * A checked and cached node size accessor wrapper.
 *
 * @internal
 */
export function cachedNodeSize<N, L>(
  nodeSize: SugiNodeSizeAccessor<N, L>
): SugiNodeSizeAccessor<N, L> {
  const cache = new Map<SugiNode, readonly [number, number]>();

  function cached(node: SugiNode<N, L>): readonly [number, number] {
    let val = cache.get(node);
    if (val === undefined) {
      val = nodeSize(node);
      const [width, height] = val;
      assert(
        width >= 0 && height >= 0,
        js`all node sizes must be non-negative, but got width ${width} and height ${height} for node '${node}'`
      );
      cache.set(node, val);
    }
    return val;
  }

  return cached;
}
