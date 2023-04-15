/**
 * A {@link DecrossTwoLayer} heuristic for reducing the number of crossings in
 * large dags efficiently.
 *
 * @packageDocumentation
 */
import { Decross } from ".";
import { bigrams } from "../../iters";
import { err, U } from "../../utils";
import { SugiNode } from "../sugify";
import { Twolayer } from "../twolayer";
import { TwolayerAgg, twolayerAgg } from "../twolayer/agg";
import { TwolayerGreedy, twolayerGreedy } from "../twolayer/greedy";
import { crossings } from "../utils";
import { decrossDfs, DecrossDfs } from "./dfs";

/** two layer operators */
export interface TwolayerOps<N = never, L = never> {
  /** the order operator */
  order: Twolayer<N, L>;
  /** the initializers */
  inits: readonly Decross<N, L>[];
}

/** the node datum of a set of operators */
export type OpNodeDatum<O extends TwolayerOps> = O extends TwolayerOps<
  infer N,
  never
>
  ? N
  : never;
/** the link datum of a set of operators */
export type OpLinkDatum<O extends TwolayerOps> = O extends TwolayerOps<
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
 * one of the built-in {@link sugiyama/twolayer!Twolayer}s.
 *
 * This method can also make multiple {@link passes} in an attempt to produce a
 * better layout.
 *
 * <img alt="two layer example" src="media://sugi-simplex-twolayer-quad.png" width="400">
 */
export interface DecrossTwoLayer<Ops extends TwolayerOps = TwolayerOps>
  extends Decross<OpNodeDatum<Ops>, OpLinkDatum<Ops>> {
  /**
   * Sets the order accessor to the specified {@link sugiyama/twolayer!Twolayer} and returns
   * a new operator. (default: {@link sugiyama/twolayer/agg!TwolayerAgg}).
   */
  order<NewOrder extends Twolayer>(
    val: NewOrder
  ): DecrossTwoLayer<U<Ops, "order", NewOrder>>;
  /**
   * Get the current {@link sugiyama/twolayer!Twolayer} for ordering.
   */
  order(): Ops["order"];

  /**
   * Sets the initialization passes to the specified {@link sugiyama/decross!Decross}s and returns
   * a new operator.
   *
   * For every initialization operator, this will run the two layer heuristic,
   * ultimately choosing the ordering that minimized overall crossings. For
   * this reason, only quick decrossing operators should be used, not expensive
   * ones. The empty list is treated as a singleton list with a noop operator.
   * (default: [decrossDfs(), decrossDfs().topDown(false)])
   */
  inits<const NewInits extends readonly Decross[]>(
    val: NewInits
  ): DecrossTwoLayer<U<Ops, "inits", NewInits>>;
  /**
   * Get the current initialization passes
   */
  inits(): Ops["inits"];

  /**
   * Sets the number of passes to make, more takes longer, but might result in
   * a better output. (default: 24)
   */
  passes(val: number): DecrossTwoLayer<Ops>;
  /**
   * Get the current number of passes
   */
  passes(): number;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/** @internal */
function buildOperator<N, L, O extends TwolayerOps<N, L>>(
  options: O &
    TwolayerOps<N, L> & {
      passes: number;
    }
): DecrossTwoLayer<O> {
  function decrossTwoLayer(layers: SugiNode<N, L>[][]): void {
    const reversed = layers.slice().reverse();

    // save optimal ordering
    let opt = layers.map((l) => l.slice());
    let optCrossings = crossings(opt);

    // NOTE empty inits is the same as one noop init
    const inits = options.inits.length ? options.inits : [() => undefined];
    for (const init of inits) {
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

  function order<NO extends Twolayer>(
    ord: NO
  ): DecrossTwoLayer<U<O, "order", NO>>;
  function order(): O["order"];
  function order<NO extends Twolayer>(
    ord?: NO
  ): O["order"] | DecrossTwoLayer<U<O, "order", NO>> {
    if (ord === undefined) {
      return options.order;
    } else {
      const { order: _, ...rest } = options;
      return buildOperator({ ...rest, order: ord });
    }
  }
  decrossTwoLayer.order = order;

  function inits<NewInits extends readonly Decross[]>(
    val: NewInits
  ): DecrossTwoLayer<U<O, "inits", NewInits>>;
  function inits(): O["inits"];
  function inits<NewInits extends readonly Decross[]>(
    val?: NewInits
  ): O["inits"] | DecrossTwoLayer<U<O, "inits", NewInits>> {
    if (val === undefined) {
      return [...options.inits];
    } else {
      const { inits: _, ...rest } = options;
      return buildOperator({ ...rest, inits: val });
    }
  }
  decrossTwoLayer.inits = inits;

  function passes(val: number): DecrossTwoLayer<O>;
  function passes(): number;
  function passes(val?: number): DecrossTwoLayer<O> | number {
    if (val === undefined) {
      return options.passes;
    } else if (val <= 0) {
      throw err`number of passes must be positive`;
    } else {
      return buildOperator({ ...options, passes: val });
    }
  }
  decrossTwoLayer.passes = passes;

  decrossTwoLayer.d3dagBuiltin = true as const;

  return decrossTwoLayer;
}

/** default two layer operator */
export type DefaultDecrossTwoLayer = DecrossTwoLayer<{
  /** default order */
  order: TwolayerGreedy<TwolayerAgg>;
  /** default inits, both dfs based */
  inits: readonly [DecrossDfs, DecrossDfs];
}>;

/**
 * Create a default {@link DecrossTwoLayer}
 *
 * - {@link DecrossTwoLayer#order | `order()`}: `twolayerGreedy().base(twolayerAgg())`
 * - {@link DecrossTwoLayer#inits | `inits()`}: `[decrossDfs(), decrossDfs().topDown(false)]`
 * - {@link DecrossTwoLayer#passes | `passes()`}: `24`
 */
export function decrossTwoLayer(...args: never[]): DefaultDecrossTwoLayer {
  if (args.length) {
    throw err`got arguments to decrossTwoLayer(${args}); you probably forgot to construct decrossTwoLayer before passing to decross: \`sugiyama().decross(decrossTwoLayer())\`, note the trailing "()"`;
  }
  return buildOperator({
    order: twolayerGreedy().base(twolayerAgg()),
    inits: [decrossDfs().topDown(true), decrossDfs().topDown(false)] as const,
    passes: 24,
  });
}
