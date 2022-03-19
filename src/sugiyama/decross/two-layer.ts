/**
 * A {@link TwoLayerOperator} heuristic for reducing the number of crossings in
 * large dags efficiently.
 *
 * @module
 */
import { DecrossOperator } from ".";
import { bigrams } from "../../utils";
import { TwolayerOperator as OrderOperator } from "../twolayer";
import { agg, AggOperator } from "../twolayer/agg";
import { crossings, SugiNode } from "../utils";

type OpNodeDatum<O extends OrderOperator> = O extends OrderOperator<
  infer N,
  never
>
  ? N
  : never;
type OpLinkDatum<O extends OrderOperator> = O extends OrderOperator<
  never,
  infer L
>
  ? L
  : never;

/**
 * A decrossing operator that minimizes the number of crossings by looking at every pair of layers.
 *
 * This method can be very fast and is a general heuristic for efficient
 * minimization. Customize with a two layer operator with {@link order} or use
 * one of the built-in {@link TwolayerOperator}s.
 *
 * This method can also make multiple {@link passes} in an attempt to produce a
 * better layout.
 *
 * <img alt="two layer example" src="media://sugi-simplex-twolayer-quad.png" width="400">
 */
export interface TwoLayerOperator<Order extends OrderOperator = OrderOperator>
  extends DecrossOperator<OpNodeDatum<Order>, OpLinkDatum<Order>> {
  /**
   * Sets the order accessor to the specified {@link TwolayerOperator} and returns
   * a new operator. (default: {@link AggOperator}).
   */
  order<NewOrder extends OrderOperator>(
    ord: NewOrder
  ): TwoLayerOperator<NewOrder>;
  /**
   * Get the current {@link TwolayerOperator} for ordering.
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

/** @internal */
function buildOperator<N, L, O extends OrderOperator<N, L>>(options: {
  order: O & OrderOperator<N, L>;
  passes: number;
}): TwoLayerOperator<O> {
  function twoLayerCall(layers: SugiNode<N, L>[][]): void {
    const reversed = layers.slice().reverse();

    // save optimal ordering
    let opt = layers.map((l) => l.slice());
    let optCrossings = crossings(opt);
    let changed = true;

    for (let i = 0; i < options.passes && changed; ++i) {
      changed = false;

      // top down
      for (const [upper, bottom] of bigrams(layers)) {
        const init = bottom.slice();
        options.order(upper, bottom, true);
        if (bottom.some((node, i) => init[i] !== node)) {
          changed = true;
        }
      }
      const topDownCrossings = crossings(layers);
      if (topDownCrossings < optCrossings) {
        optCrossings = topDownCrossings;
        opt = layers.map((l) => l.slice());
      }

      // bottom up
      for (const [lower, topl] of bigrams(reversed)) {
        const init = topl.slice();
        options.order(topl, lower, false);
        if (topl.some((node, i) => init[i] !== node)) {
          changed = true;
        }
      }
      const bottomUpCrossings = crossings(layers);
      if (bottomUpCrossings < optCrossings) {
        optCrossings = bottomUpCrossings;
        opt = layers.map((l) => l.slice());
      }
    }

    // replace optimal ordering
    layers.splice(0, layers.length, ...opt);
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

export type DefaultTwoLayerOperator = TwoLayerOperator<AggOperator>;

/**
 * Create a default {@link TwoLayerOperator}, bundled as
 * {@link decrossTwoLayer}.
 */
export function twoLayer(...args: never[]): DefaultTwoLayerOperator {
  if (args.length) {
    throw new Error(
      `got arguments to twoLayer(${args}), but constructor takes no arguments.`
    );
  }
  return buildOperator({ order: agg(), passes: 1 });
}
