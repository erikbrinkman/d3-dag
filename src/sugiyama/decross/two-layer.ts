/**
 * A {@link TwoLayerOperator} heuristic for reducing the number of crossings in
 * large dags efficiently.
 *
 * @module
 */

import { AggOperator, agg } from "../twolayer/agg";
import { LinkDatum, NodeDatum, SugiDataDagNode } from "../utils";
import { bigrams, def } from "../../utils";

import { DecrossOperator } from ".";
import { TwolayerOperator as OrderOperator } from "../twolayer";

type OpSugiNode<O extends OrderOperator> = Parameters<O>[0][number];
type OpSugiData<O extends OrderOperator> = OpSugiNode<O>["data"];
type OpNodeDatum<O extends OrderOperator> = NodeDatum<
  SugiDataDagNode<OpSugiData<O>>
>;
type OpLinkDatum<O extends OrderOperator> = LinkDatum<
  SugiDataDagNode<OpSugiData<O>>
>;

/**
 * A decrossing operator that minimizes the number of crossings by looking at every pair of layers.
 *
 * This method can be very fast and is a general heuristic for efficient
 * minimization. Customize with a two layer operator with {@link order} or use
 * one of the built-in {@link TwolayerOperator}s.
 *
 * This methos can also make multiple {@link passes} in an attempt to produce a
 * better layout.
 *
 * <img alt="two layer example" src="media://two_layer_greedy.png" width="400">
 */
export interface TwoLayerOperator<Order extends OrderOperator = OrderOperator>
  extends DecrossOperator<OpNodeDatum<Order>, OpLinkDatum<Order>> {
  /**
   * Sets the order accessor to the specified {@link TwolayerOperator} and returns
   * a new operator. (default: {@link MedianOperator}).
   */
  order<NewOrder extends OrderOperator>(
    ord: NewOrder
  ): TwoLayerOperator<NewOrder>;
  /**
   * Get the current {@link OrderOperator}.
   */
  order(): Order;

  /**
   * Sets the number of passes to make, more takes longer, but might result in
   * a better output. (default: 1)
   */
  passes(val: number): TwoLayerOperator<Order>;
  /**
   * Get the current number of passes
   */
  passes(): number;
}

// TODO Add optional greedy swapping of nodes after assignment
// TODO Add two layer noop. This only makes sense if there's a greedy swapping ability

/** @internal */
function buildOperator<O extends OrderOperator>(options: {
  order: O;
  passes: number;
}): TwoLayerOperator<O> {
  function twoLayerCall(layers: OpSugiNode<O>[][]): void {
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

  function order<NO extends OrderOperator>(ord: NO): TwoLayerOperator<NO>;
  function order(): O;
  function order<NO extends OrderOperator>(ord?: NO): O | TwoLayerOperator<NO> {
    if (ord === undefined) {
      return options.order;
    } else {
      const { order: _, ...rest } = options;
      return buildOperator({ ...rest, order: ord });
    }
  }
  twoLayerCall.order = order;

  function passes(val: number): TwoLayerOperator<O>;
  function passes(): number;
  function passes(val?: number): TwoLayerOperator<O> | number {
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

/**
 * Create a default {@link TwoLayerOperator}, bundled as
 * {@link decrossTwoLayer}.
 */
export function twoLayer(...args: never[]): TwoLayerOperator<AggOperator> {
  if (args.length) {
    throw new Error(
      `got arguments to twoLayer(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ order: agg(), passes: 1 });
}
