/**
 * Create a decrossing operator that minimizes the number of decrossings
 * heuristically by looking at each pair of layers. This method is very fast and very general and pften produces good results. It is also highly customizable, and can be parametrized by any [["sugiyama/twolayer/index" | two layer operator]].
 *
 * Create a new [[TwoLayerOperator]] with [[twoLayer]].
 *
 * <img alt="two layer example" src="media://two_layer_greedy.png" width="400">
 *
 * @packageDocumentation
 */

import { MedianOperator, median } from "../twolayer/median";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { Operator } from ".";
import { Operator as OrderOperator } from "../twolayer";

export interface TwoLayerOperator<
  NodeType extends DagNode,
  TwoLayer extends OrderOperator<NodeType> = OrderOperator<NodeType>
> extends Operator<NodeType> {
  /**
   * Sets the order accessor to the specified [[OrderOperator]] and returns
   * this [[TwoLayerOperator]]. See the [["sugiyama/twolayer/index" | two
   * layer]] module for more information on order operators.
   */
  order<NewTwoLayer extends OrderOperator<NodeType>>(
    ord: NewTwoLayer
  ): TwoLayerOperator<NodeType, NewTwoLayer>;
  /**
   * Get the current [[OrderOperator]] which defaults to [[median]].
   */
  order(): TwoLayer;
}

// TODO Add number of passes, with 0 being keep passing up and down until no changes (is this guaranteed to never change?, maybe always terminate if no changes, so this can be set very high to almost achieve that effect)
// TODO Add optional greedy swapping of nodes after assignment
// TODO Add two layer noop. This only makes sense if there's a greedy swapping ability

/** @internal */
function buildOperator<
  NodeType extends DagNode,
  TwoLayer extends OrderOperator<NodeType>
>(orderOp: TwoLayer): TwoLayerOperator<NodeType, TwoLayer> {
  function twoLayerCall(layers: (NodeType | DummyNode)[][]): void {
    layers
      .slice(0, layers.length - 1)
      .forEach((layer, i) => orderOp(layer, layers[i + 1]));
  }

  function order(): TwoLayer;
  function order<NewTwoLayer extends OrderOperator<NodeType>>(
    ord: NewTwoLayer
  ): TwoLayerOperator<NodeType, NewTwoLayer>;
  function order<NewTwoLayer extends OrderOperator<NodeType>>(
    ord?: NewTwoLayer
  ): TwoLayer | TwoLayerOperator<NodeType, NewTwoLayer> {
    if (ord === undefined) {
      return orderOp;
    } else {
      const localOrder = ord;
      return buildOperator(localOrder);
    }
  }
  twoLayerCall.order = order;

  return twoLayerCall;
}

/** Create a default [[TwoLayerOperator]]. */
export function twoLayer<NodeType extends DagNode>(
  ...args: never[]
): TwoLayerOperator<NodeType, MedianOperator<NodeType>> {
  if (args.length) {
    throw new Error(
      `got arguments to twoLayer(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(median());
}
