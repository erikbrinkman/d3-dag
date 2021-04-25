/**
 * Assigns column indices to the layer with most nodes first. Afterwards
 * starting from the layer with most nodes, column indices are assigned to
 * nodes in adjacent layers. Column indices are assigned with respect to the
 * node's parents or children while maintaining the same ordering in the layer.
 * In comparison to *left* and *center*, this accessor takes the adjacent layer
 * into account and tries to assign a column index that is near the column
 * index of the child or parent. Because nodes can be placed in the same column
 * even though they do not have a children/parents relation with each other,
 * nodes can overlap if nodes in different layers have different heights.
 * Therefore, the following example sets *node*.heightRatio to 1 for all nodes.
 *
 * <img alt="arquint adjacent example" src="media://arquint_adjacent_center.png" width="400">
 *
 * @module
 */
import { IndexableNode, Operator } from ".";
import { SafeMap, def } from "../../utils";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export interface AdjacentOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /** Set whether the nodes should be centered. */
  center(val: boolean): AdjacentOperator<NodeType>;
  /** Get the current center value. */
  center(): boolean;
}

/** @interal */
function buildOperator<NodeType extends DagNode>(
  centerVal: boolean
): AdjacentOperator<NodeType> {
  function adjacentCall(
    layers: ((NodeType & IndexableNode) | DummyNode)[][]
  ): void {
    // assigns column indices to the layer with most nodes first.
    // afterwards starting from the layer with most nodes, column indices are assigned
    // to nodes in adjacent layers. Column indices are assigned with respect to the
    // node's parents or children while maintaining the same ordering in the layer.
    // overlapping nodes can occur because nodes can be placed in the same column
    // although they do not have a children/parents relation with each other

    // create parents
    const parentMap = new SafeMap<
      string,
      ((NodeType & IndexableNode) | DummyNode)[]
    >();
    for (const layer of layers) {
      for (const node of layer) {
        for (const child of node.ichildren()) {
          parentMap.setIfAbsent(child.id, []).push(node);
        }
      }
    }

    // find layer index with most entries:
    const maxNodesCount = Math.max(...layers.map((layer) => layer.length));
    const maxNodesLayerIndex = layers.findIndex(
      (layer) => layer.length === maxNodesCount
    );

    // layer with most nodes simply assign columnIndex to the node's index:
    for (const [index, node] of layers[maxNodesLayerIndex].entries()) {
      node.columnIndex = index;
    }

    // layer with most nodes stays unchanged
    // first, visit each layer above the layer with most nodes
    for (const layer of layers.slice(0, maxNodesLayerIndex).reverse()) {
      fillLayerBackward(layer);
    }

    // then, visit each layer below the layer with most nodes
    for (const layer of layers.slice(maxNodesLayerIndex + 1)) {
      fillLayerForward(layer);
    }

    function fillLayerBackward<
      N extends (NodeType & IndexableNode) | DummyNode
    >(layer: N[]): void {
      if (layer.length === maxNodesCount) {
        // leave layer unchanged
        for (const [index, node] of layer.entries()) {
          node.columnIndex = index;
        }
      } else {
        // map each node to its desired location:
        const desiredColumnIndices = layer.map((node, index) => {
          if (node.dataChildren.length === 0) {
            return index;
          }
          const childrenColumnIndices = [
            ...node.ichildren().map((child) => def(child.columnIndex))
          ];
          if (centerVal) {
            // return column index of middle child
            return childrenColumnIndices.sort((a, b) => a - b)[
              Math.floor((childrenColumnIndices.length - 1) / 2)
            ];
          } else {
            return Math.min(...childrenColumnIndices);
          }
        });

        // based on the desired column index, the actual column index needs to
        // be assigned however, the column indices have to be strictly
        // monotonically increasing and have to be greater or equal 0 and
        // smaller than maxNodesCount!
        const indices = optimizeColumnIndices(desiredColumnIndices);
        for (const [index, node] of layer.entries()) {
          node.columnIndex = indices[index];
        }
      }
    }

    function fillLayerForward<N extends (NodeType & IndexableNode) | DummyNode>(
      layer: N[]
    ): void {
      if (layer.length === maxNodesCount) {
        // leave layer unchanged
        for (const [index, node] of layer.entries()) {
          node.columnIndex = index;
        }
      } else {
        // map each node to its desired location:
        const desiredColumnIndices = layer.map((node, index) => {
          const parents = parentMap.getDefault(node.id, []);
          if (parents.length === 0) {
            return index;
          }
          const parentColumnIndices = parents.map((par) =>
            def(par.columnIndex)
          );
          if (centerVal) {
            // return column index of middle parent
            return parentColumnIndices[
              Math.floor((parentColumnIndices.length - 1) / 2)
            ];
          } else {
            return Math.min(...parentColumnIndices);
          }
        });
        // based on the desired column index, the actual column index needs to
        // be assigned however, the column indices have to be strictly
        // monotonically increasing and have to be greater or equal 0 and
        // smaller than maxNodesCount!
        const indices = optimizeColumnIndices(desiredColumnIndices);
        for (const [index, node] of layer.entries()) {
          node.columnIndex = indices[index];
        }
      }
    }

    function optimizeColumnIndices(desiredColumnIndices: number[]): number[] {
      for (const columnIndex of desiredColumnIndices) {
        if (!isFinite(columnIndex)) {
          throw new Error(`columnComplex: non-finite column index encountered`);
        }
      }

      // step 1: reorder indices such that they are strictly monotonically increasing
      let largestIndex = -1;
      desiredColumnIndices = desiredColumnIndices.map((columnIndex) => {
        if (columnIndex <= largestIndex) {
          columnIndex = largestIndex + 1;
        }
        largestIndex = columnIndex;
        return columnIndex;
      });

      // step 2: shift indices such that they are larger or equal 0 and smaller than maxNodesCount
      const max = Math.max(...desiredColumnIndices);
      const downShift = max - (maxNodesCount - 1);
      if (downShift > 0) {
        // nodes need to be shifted by that amount
        desiredColumnIndices = desiredColumnIndices.map((columnIndex, index) =>
          Math.max(columnIndex - downShift, index)
        );
      }

      return desiredColumnIndices;
    }
  }

  function center(): boolean;
  function center(val: boolean): AdjacentOperator<NodeType>;
  function center(val?: boolean): boolean | AdjacentOperator<NodeType> {
    if (val === undefined) {
      return centerVal;
    } else {
      return buildOperator(val);
    }
  }
  adjacentCall.center = center;

  return adjacentCall;
}

/** Create a default adjacent operator. */
export function adjacent<NodeType extends DagNode>(
  ...args: never[]
): AdjacentOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to adjacent(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(false);
}
