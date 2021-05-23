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
import { bigrams, def } from "../../utils";

import { DagNode } from "../../dag/node";
import { DecrossOperator } from ".";
import { DummyNode } from "../dummy";
import { TwolayerOperator as OrderOperator } from "../twolayer";

export interface TwoLayerOperator<
  NodeDatum = unknown,
  LinkDatum = unknown,
  Order extends OrderOperator<NodeDatum, LinkDatum> = OrderOperator<
    NodeDatum,
    LinkDatum
  >
> extends DecrossOperator<NodeDatum, LinkDatum> {
  /**
   * Sets the order accessor to the specified {@link OrderOperator} and returns
   * this {@link TwoLayerOperator}. See the {@link "sugiyama/twolayer/index" | two
   * layer} module for more information on order operators.
   */
  order<
    NewNodeDatum,
    NewLinkDatum,
    NewOrder extends OrderOperator<NewNodeDatum, NewLinkDatum>
  >(
    ord: NewOrder & OrderOperator<NewNodeDatum, NewLinkDatum>
  ): TwoLayerOperator<NewNodeDatum, NewLinkDatum, NewOrder>;
  /**
   * Get the current {@link OrderOperator} which defaults to {@link median}.
   */
  order(): Order;

  /**
   * Sets the number of passes to make, more takes longer, but might result in
   * a better output. (default: 1)
   */
  passes(val: number): TwoLayerOperator<NodeDatum, LinkDatum, Order>;
  /**
   * Get the current number of passes
   */
  passes(): number;
}

// TODO Add optional greedy swapping of nodes after assignment
// TODO Add two layer noop. This only makes sense if there's a greedy swapping ability

/** @internal */
function buildOperator<N, L, Order extends OrderOperator<N, L>>(options: {
  order: Order;
  passes: number;
}): TwoLayerOperator<N, L, Order> {
  function twoLayerCall(layers: (DagNode<N, L> | DummyNode)[][]): void {
    const reversed = layers.slice().reverse();

    let changed = true;
    for (let i = 0; i < options.passes && changed; ++i) {
      changed = false;

      // top down
      for (const [upper, bottom] of bigrams(layers)) {
        const init = new Map(bottom.map((node, i) => [node, i] as const));
        options.order(upper, bottom, true);
        if (bottom.some((node, i) => def(init.get(node)) !== i)) {
          changed = true;
        }
      }

      // bottom up
      for (const [lower, topl] of bigrams(reversed)) {
        const init = new Map(topl.map((node, i) => [node, i] as const));
        options.order(topl, lower, false);
        if (topl.some((node, i) => def(init.get(node)) !== i)) {
          changed = true;
        }
      }
    }
  }

  function order<NN, NL, NewOrder extends OrderOperator<NN, NL>>(
    ord: NewOrder
  ): TwoLayerOperator<NN, NL, NewOrder>;
  function order(): Order;
  function order<NN, NL, NewOrder extends OrderOperator<NN, NL>>(
    ord?: NewOrder
  ): Order | TwoLayerOperator<NN, NL, NewOrder> {
    if (ord === undefined) {
      return options.order;
    } else {
      const localOrder = ord;
      const { order: _, ...rest } = options;
      return buildOperator({ ...rest, order: localOrder });
    }
  }
  twoLayerCall.order = order;

  function passes(val: number): TwoLayerOperator<N, L, Order>;
  function passes(): number;
  function passes(val?: number): TwoLayerOperator<N, L, Order> | number {
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
export function twoLayer(
  ...args: never[]
): TwoLayerOperator<unknown, unknown, MedianOperator> {
  if (args.length) {
    throw new Error(
      `got arguments to twoLayer(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ order: median(), passes: 1 });
}
