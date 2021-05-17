import { DagNode } from "../dag/node";
import { DummyNode } from "./dummy";
import { NodeSizeAccessor } from "./coord";
import { js } from "../utils";

/**
 * A checked and cached node size accessor wrapper.
 *
 * @internal
 */
export function cachedNodeSize<NodeType extends DagNode>(
  nodeSize: NodeSizeAccessor<NodeType>
): NodeSizeAccessor<NodeType> {
  const cache = new Map<NodeType | DummyNode, readonly [number, number]>();

  function cached(node: NodeType | DummyNode): readonly [number, number] {
    let val = cache.get(node);
    if (val === undefined) {
      val = nodeSize(node);
      const [width, height] = val;
      if (width < 0 || height < 0) {
        throw new Error(
          js`all node sizes must be non-negative, but got width ${width} and height ${height} for node '${node}'`
        );
      }
      cache.set(node, val);
    }
    return val;
  }

  return cached;
}
