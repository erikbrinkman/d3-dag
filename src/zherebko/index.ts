/**
 * This layout algorithm constructs a topological representation of the DAG
 * meant for visualization. The algorithm is based off a PR by D. Zherebko. The
 * nodes are topologically ordered, and edges are then positioned into "lanes"
 * to the left and right of the nodes.
 *
 * <img alt="zherebko example" src="media://zherebko.png" width="1000">
 *
 * @packageDocumentation
 */
import { Dag, DagNode, DagRoot } from "../dag/node";

import { greedy } from "./greedy";

/** @internal */
interface PartialNode {
  layer: number;
  x?: number;
  y?: number;
}

export interface ZherebkoNode extends PartialNode {
  x: number;
  y: number;
}

export interface ZherebkoOperator<NodeType extends DagNode> {
  /** Layout the input DAG. */
  (dag: NodeType): NodeType & ZherebkoNode;
  (dag: DagRoot<NodeType>): DagRoot<NodeType & ZherebkoNode>;
  (dag: Dag<NodeType>): Dag<NodeType & ZherebkoNode>;

  /**
   * Sets this zherebko layout's size to the specified two-element array of
   * numbers [ *width*, *height* ] and returns this [[ZherebkoOperator]]..
   */
  size(sz: [number, number]): ZherebkoOperator<NodeType>;
  /** Get the current size, which defaults to [1, 1]. */
  size(): [number, number];
}

/** @internal */
function buildOperator<NodeType extends DagNode>(
  width: number,
  height: number
): ZherebkoOperator<NodeType> {
  /** topological layering */
  function layer<N extends NodeType & { layer?: number }>(
    dag: Dag<N>
  ): (N & PartialNode)[] {
    const ordered = [...dag.idescendants("before")];
    for (const [layer, node] of ordered.entries()) {
      node.layer = layer;
    }
    return ordered as (N & PartialNode)[];
  }

  function zherebkoCall(dag: NodeType): NodeType & ZherebkoNode;
  function zherebkoCall(
    dag: DagRoot<NodeType>
  ): DagRoot<NodeType & ZherebkoNode>;
  function zherebkoCall(dag: Dag<NodeType>): Dag<NodeType & ZherebkoNode>;
  function zherebkoCall(dag: Dag<NodeType>): Dag<NodeType & ZherebkoNode> {
    // topological sort
    const ordered = layer(dag);

    const maxLayer = ordered.length - 1;
    if (maxLayer === 0) {
      // center if only one node
      const [node] = ordered;
      node.x = width / 2;
      node.y = height / 2;
    } else {
      // get link indices
      const indices = greedy(ordered);

      // assign points to links
      assignPositions(dag as Dag<NodeType & PartialNode>, indices, maxLayer);
    }

    return dag as Dag<NodeType & ZherebkoNode>;
  }

  function assignPositions<LayeredNodeType extends NodeType & PartialNode>(
    dag: Dag<LayeredNodeType>,
    indices: Map<string, number>,
    maxLayer: number
  ): void {
    // map to coordinates
    let minIndex = 0;
    let maxIndex = 0;
    for (const { source, target } of dag.ilinks()) {
      if (target.layer > source.layer + 1) {
        const index = indices.get(`${source.id}\0${target.id}`);
        /* istanbul ignore next */
        if (index === undefined) {
          throw new Error(`indexer didn't index ${source.id} -> ${target.id}`);
        }
        minIndex = Math.min(minIndex, index);
        maxIndex = Math.max(maxIndex, index);
      }
    }
    if (minIndex === maxIndex) {
      // center if graph is a line
      minIndex = -1;
      maxIndex = 1;
    }
    for (const node of dag) {
      node.x = (-minIndex / (maxIndex - minIndex)) * width;
      node.y = (node.layer / maxLayer) * height;
    }

    assignPoints(
      dag as Dag<NodeType & ZherebkoNode>,
      indices,
      maxLayer,
      minIndex,
      maxIndex
    );
  }

  function assignPoints<PosNodeType extends NodeType & ZherebkoNode>(
    dag: Dag<PosNodeType>,
    indices: Map<string, number>,
    maxLayer: number,
    minIndex: number,
    maxIndex: number
  ): void {
    for (const { source, target, points } of dag.ilinks()) {
      points.length = 0;
      points.push({ x: source.x, y: source.y });

      if (target.layer - source.layer > 1) {
        const index = indices.get(`${source.id}\0${target.id}`);
        /* istanbul ignore next */
        if (index === undefined) {
          throw new Error(`indexer didn't index ${source.id} -> ${target.id}`);
        }
        const x = ((index - minIndex) / (maxIndex - minIndex)) * width;
        const y1 = ((source.layer + 1) / maxLayer) * height;
        const y2 = ((target.layer - 1) / maxLayer) * height;
        if (target.layer - source.layer > 2) {
          points.push({ x: x, y: y1 }, { x: x, y: y2 });
        } else {
          points.push({ x: x, y: y1 });
        }
      }

      points.push({ x: target.x, y: target.y });
    }
  }

  function size(): [number, number];
  function size(sz: [number, number]): ZherebkoOperator<NodeType>;
  function size(
    sz?: [number, number]
  ): [number, number] | ZherebkoOperator<NodeType> {
    if (sz === undefined) {
      return [width, height];
    } else {
      const [newWidth, newHeight] = sz;
      return buildOperator(newWidth, newHeight);
    }
  }
  zherebkoCall.size = size;

  return zherebkoCall;
}

/** Create a new [[ZherebkoOperator]] with default settings. */
export function zherebko<NodeType extends DagNode>(
  ...args: never[]
): ZherebkoOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to zherebko(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(1, 1);
}
