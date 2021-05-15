/**
 * Create a decrossing operator that minimizes the number of decrossings
 * heuristically by looking at each pair of layers. This method is very fast and very general and pften produces good results. It is also highly customizable, and can be parametrized by any {@link "sugiyama/twolayer/index" | two layer operator}.
 *
 * Create a new {@link TwoLayerOperator} with {@link twoLayer}.
 *
 * <img alt="two layer example" src="media://two_layer_greedy.png" width="400">
 *
 * @module
 */

import { MedianOperator, median } from "../twolayer/median";
import { Replace, def } from "../../utils";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { Operator } from ".";
import { Operator as OrderOperator } from "../twolayer";

interface Operators<NodeType extends DagNode> {
  order: OrderOperator<NodeType>;
}

export interface TwoLayerOperator<
  NodeType extends DagNode,
  Ops extends Operators<NodeType> = Operators<NodeType>
> extends Operator<NodeType> {
  /**
   * Sets the order accessor to the specified {@link OrderOperator} and returns
   * this {@link TwoLayerOperator}. See the {@link "sugiyama/twolayer/index" | two
   * layer} module for more information on order operators.
   */
  order<NewOrder extends OrderOperator<NodeType>>(
    ord: NewOrder
  ): TwoLayerOperator<NodeType, Replace<Ops, "order", NewOrder>>;
  /**
   * Get the current {@link OrderOperator} which defaults to {@link median}.
   */
  order(): Ops["order"];

  /**
   * Sets the number of passes to make, more takes longer, but might result in
   * a better output. (default: 1)
   */
  passes(val: number): TwoLayerOperator<NodeType, Ops>;
  /**
   * Get the current number of passes
   */
  passes(): number;
}

// TODO Add optional greedy swapping of nodes after assignment
// TODO Add two layer noop. This only makes sense if there's a greedy swapping ability

/** @internal */
function buildOperator<
  NodeType extends DagNode,
  Ops extends Operators<NodeType>
>(options: Ops & { passes: number }): TwoLayerOperator<NodeType, Ops> {
  function twoLayerCall(layers: (NodeType | DummyNode)[][]): void {
    const reversed = layers.slice().reverse();

    let changed = true;
    for (let i = 0; i < options.passes && changed; ++i) {
      changed = false;

      // top down
      let [upper, ...bottoms] = layers;
      for (const bottom of bottoms) {
        const init = new Map(bottom.map((node, i) => [node, i] as const));
        options.order(upper, bottom, true);
        if (bottom.some((node, i) => def(init.get(node)) !== i)) {
          changed = true;
        }
        upper = bottom;
      }

      // bottom up
      let [lower, ...tops] = reversed;
      for (const topl of tops) {
        const init = new Map(topl.map((node, i) => [node, i] as const));
        options.order(topl, lower, false);
        if (topl.some((node, i) => def(init.get(node)) !== i)) {
          changed = true;
        }
        lower = topl;
      }
    }
  }

  function order(): Ops["order"];
  function order<NewOrder extends OrderOperator<NodeType>>(
    ord: NewOrder
  ): TwoLayerOperator<NodeType, Replace<Ops, "order", NewOrder>>;
  function order<NewOrder extends OrderOperator<NodeType>>(
    ord?: NewOrder
  ):
    | Ops["order"]
    | TwoLayerOperator<NodeType, Replace<Ops, "order", NewOrder>> {
    if (ord === undefined) {
      return options.order;
    } else {
      const localOrder = ord;
      const { order: _, ...rest } = options;
      return buildOperator({ ...rest, order: localOrder });
    }
  }
  twoLayerCall.order = order;

  function passes(val: number): TwoLayerOperator<NodeType, Ops>;
  function passes(): number;
  function passes(val?: number): TwoLayerOperator<NodeType, Ops> | number {
    if (val === undefined) {
      return options.passes;
    } else if (val <= 0) {
      throw new Error("number of passes must be positive");
    } else {
      return buildOperator({ ...options, passes: val });
    }
  }
  twoLayerCall.passes = passes;

  return twoLayerCall;
}

/** Create a default {@link TwoLayerOperator}. */
export function twoLayer<NodeType extends DagNode>(
  ...args: never[]
): TwoLayerOperator<NodeType, { order: MedianOperator }> {
  if (args.length) {
    throw new Error(
      `got arguments to twoLayer(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ order: median(), passes: 1 });
}
