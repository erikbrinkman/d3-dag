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

import { LinkDatum, NodeDatum, SugiDataDagNode } from "../utils";
import { MedianOperator, median } from "../twolayer/median";
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

export interface TwoLayerOperator<Order extends OrderOperator = OrderOperator>
  extends DecrossOperator<OpNodeDatum<Order>, OpLinkDatum<Order>> {
  /**
   * Sets the order accessor to the specified {@link OrderOperator} and returns
   * this {@link TwoLayerOperator}. See the {@link "sugiyama/twolayer/index" | two
   * layer} module for more information on order operators.
   */
  order<NewOrder extends OrderOperator>(
    ord: NewOrder
  ): TwoLayerOperator<NewOrder>;
  /**
   * Get the current {@link OrderOperator} which defaults to {@link median}.
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

/** Create a default {@link TwoLayerOperator}. */
export function twoLayer(...args: never[]): TwoLayerOperator<MedianOperator> {
  if (args.length) {
    throw new Error(
      `got arguments to twoLayer(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ order: median(), passes: 1 });
}
