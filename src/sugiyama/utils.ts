import { DagNode } from "../dag/node";
import { DummyNode } from "./dummy";
import { NodeSizeAccessor } from "./coord";

/**
 * A checked and cached node size accessor wrapper.
 *
 * @internal
 */
export function cachedNodeSize<NodeType extends DagNode>(
  nodeSize: NodeSizeAccessor<NodeType>
): NodeSizeAccessor<NodeType> {
  const cache = new Map<string, [number, number]>();

  function cached(node: NodeType | DummyNode): [number, number] {
    let val = cache.get(node.id);
    if (val === undefined) {
      val = nodeSize(node);
      const [width, height] = val;
      if (width < 0 || height < 0) {
        throw new Error(
          `all node sizes must be non-negative, but got width ${width} and height ${height} for node id: ${node.id}`
        );
      }
      cache.set(node.id, val);
    }
    return val;
  }

  return cached;
}
