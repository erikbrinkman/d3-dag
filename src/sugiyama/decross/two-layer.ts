/**
 * A {@link TwoLayerOperator} heuristic for reducing the number of crossings in
 * large dags efficiently.
 *
 * @module
 */
import { DecrossOperator } from ".";
import { bigrams, Up } from "../../utils";
import { TwolayerOperator as OrderOperator } from "../twolayer";
import { agg, AggOperator } from "../twolayer/agg";
import { crossings, SugiNode } from "../utils";

type Inits<N = never, L = never> = readonly [
  DecrossOperator<N, L>,
  ...DecrossOperator<N, L>[]
];

interface Operators<N = never, L = never> {
  order: OrderOperator<N, L>;
  inits: Inits<N, L>;
}

type OpNodeDatum<O extends Operators> = O extends Operators<infer N, never>
  ? N
  : never;
type OpLinkDatum<O extends Operators> = O extends Operators<never, infer L>
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
export interface TwoLayerOperator<Ops extends Operators = Operators>
  extends DecrossOperator<OpNodeDatum<Ops>, OpLinkDatum<Ops>> {
  /**
   * Sets the order accessor to the specified {@link TwolayerOperator} and returns
   * a new operator. (default: {@link AggOperator}).
   */
  order<NewOrder extends OrderOperator>(
    val: NewOrder
  ): TwoLayerOperator<Up<Ops, { order: NewOrder }>>;
  /**
   * Get the current {@link TwolayerOperator} for ordering.
   */
  order(): Ops["order"];

  /**
   * Sets the initialization passes to the specified {@link DecrossOperator}s and returns
   * a new operator.
   *
   * For every initialization operator, this will run the two layer heuristic,
   * ultimately choosing the ordering that minimized overall crossings. For
   * this reason, only quick decrossing operators should be used, not expensive
   * ones.  (default: [noop])
   */
  inits<NewInits extends Inits>(
    val: NewInits
  ): TwoLayerOperator<Up<Ops, { inits: NewInits }>>;
  /**
   * Get the current initialization passes
   */
  inits(): Ops["inits"];

  /**
   * Sets the number of passes to make, more takes longer, but might result in
   * a better output. (default: 1)
   */
  passes(val: number): TwoLayerOperator<Ops>;
  /**
   * Get the current number of passes
   */
  passes(): number;
}

/** @internal */
function buildOperator<N, L, O extends Operators<N, L>>(
  options: O &
    Operators<N, L> & {
      passes: number;
    }
): TwoLayerOperator<O> {
  function twoLayerCall(layers: SugiNode<N, L>[][]): void {
    const reversed = layers.slice().reverse();

    // save optimal ordering
    let opt = layers.map((l) => l.slice());
    let optCrossings = crossings(opt);

    for (const init of options.inits) {
      init(layers);

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
    }

    // replace optimal ordering
    layers.splice(0, layers.length, ...opt);
  }

  function order<NO extends OrderOperator>(
    ord: NO
  ): TwoLayerOperator<Up<O, { order: NO }>>;
  function order(): O["order"];
  function order<NO extends OrderOperator>(
    ord?: NO
  ): O["order"] | TwoLayerOperator<Up<O, { order: NO }>> {
    if (ord === undefined) {
      return options.order;
    } else {
      const { order: _, ...rest } = options;
      return buildOperator({ ...rest, order: ord });
    }
  }
  twoLayerCall.order = order;

  function inits<NewInits extends Inits>(
    val: NewInits
  ): TwoLayerOperator<Up<O, { inits: NewInits }>>;
  function inits(): O["inits"];
  function inits<NewInits extends Inits>(
    val?: NewInits
  ): O["inits"] | TwoLayerOperator<Up<O, { inits: NewInits }>> {
    if (val === undefined) {
      return [...options.inits];
    } else if (val.length) {
      const { inits: _, ...rest } = options;
      // not sure why the cast here is necessary
      return buildOperator({ ...rest, inits: [...val] as NewInits });
    } else {
      throw new Error(
        "inits must be a non-empty array, maybe you intended the singleton noop: `[() => undefined]`"
      );
    }
  }
  twoLayerCall.inits = inits;

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

export type DefaultTwoLayerOperator = TwoLayerOperator<{
  order: AggOperator;
  inits: [DecrossOperator<unknown, unknown>];
}>;

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
  return buildOperator({ order: agg(), inits: [() => undefined], passes: 1 });
}
