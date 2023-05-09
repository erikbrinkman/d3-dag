/**
 * A {@link DecrossTwoLayer} heuristic for reducing the number of crossings in
 * large dags efficiently.
 *
 * @packageDocumentation
 */
import { Decross } from ".";
import { bigrams } from "../../iters";
import { nameSymbol } from "../../layout";
import { err, U } from "../../utils";
import { SugiNode } from "../sugify";
import { Twolayer } from "../twolayer";
import { TwolayerAgg, twolayerAgg } from "../twolayer/agg";
import { TwolayerGreedy, twolayerGreedy } from "../twolayer/greedy";
import { crossings } from "../utils";
import { decrossDfs, DecrossDfs } from "./dfs";

/** two layer operators */
export interface DecrossTwoLayerOps<N = never, L = never> {
  /** the order operator */
  order: Twolayer<N, L>;
  /** the initializers */
  inits: readonly Decross<N, L>[];
}

/**
 * a decrossing operator that reorders by looking at pairs of layers
 *
 * This method can be very fast and is a general heuristic for efficient
 * minimization. Customize with a two layer operator with {@link order},
 * different {@link inits}, or the number of {@link passes}.
 */
export interface DecrossTwoLayer<
  Ops extends DecrossTwoLayerOps = DecrossTwoLayerOps
> extends Decross<
    Ops extends DecrossTwoLayerOps<infer N, never> ? N : never,
    Ops extends DecrossTwoLayerOps<never, infer L> ? L : never
  > {
  /**
   * sets the {@link Twolayer} accessor for minimizing a layer at a time
   *
   * The {@link Twolayer} operator takes pairs of layers, and reorders one.
   * There are three built-in variants:
   * - {@link twolayerGreedy} - This takes another two-layer operator, runs it,
   *   and then afterwards performs greedy swaps of nodes to reduce the number
   *   of edge crossings further. While not perfect, it can improve the results
   *   of simpler heuristics.
   * - {@link twolayerAgg} - This aggregates the indices of ancestor nodes and
   *   orders nodes according to those aggregates. This is very fast and
   *   produces a good first-order decrossing, but is best when used in
   *   conjunction with {@link twolayerGreedy}.
   * - {@link twolayerOpt} - This is the sibling to {@link decrossOpt} that
   *   only optimizes a single layer, but otherwise has similar options. Just
   *   like full optimal decrossing, this will fail on large graphs, but also
   *   rarely produces better results than the combination of {@link
   *   twolayerGreedy} and {@link twolayerAgg}.
   *
   * (default: {@link twolayerGreedy})
   */
  order<NewOrder extends Twolayer>(
    val: NewOrder
  ): DecrossTwoLayer<U<Ops, "order", NewOrder>>;
  /**
   * get the current {@link Twolayer} for ordering
   */
  order(): Ops["order"];

  /**
   * sets the initialization passes before decrossings
   *
   * For every initialization operator, this will run the two layer heuristic,
   * ultimately choosing the ordering that minimized overall crossings. For
   * this reason, only quick decrossing operators should be used, not expensive
   * ones. The empty list is treated as a singleton list with a noop operator.
   *
   * (default: `[decrossDfs(), decrossDfs().topDown(false)]`)
   */
  inits<const NewInits extends readonly Decross[]>(
    val: NewInits
  ): DecrossTwoLayer<U<Ops, "inits", NewInits>>;
  /**
   * get the current initialization passes
   */
  inits(): Ops["inits"];

  /**
   * sets the number of passes to make
   *
   * More passes may take longer, but might result in a better output.
   *
   * (default: `24`)
   */
  passes(val: number): DecrossTwoLayer<Ops>;
  /**
   * get the current number of passes
   */
  passes(): number;

  /** @internal */
  readonly [nameSymbol]: "decrossTwoLayer";
}

/** @internal */
function buildOperator<N, L, O extends DecrossTwoLayerOps<N, L>>(
  options: O &
    DecrossTwoLayerOps<N, L> & {
      passes: number;
    }
): DecrossTwoLayer<O> {
  function decrossTwoLayer(layers: SugiNode<N, L>[][]): void {
    // FIXME this won't necessarily work with compact depending on how one
    // layer gets ordered, it might affect a crossing on another layer. We
    // might be able to get around it by mapping some constraints of possible
    // move based on lower crossings
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

  decrossTwoLayer[nameSymbol] = "decrossTwoLayer" as const;

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
 * create a default {@link DecrossTwoLayer}
 *
 * This operator scans over the layered representation multiple times, applying
 * a heuristic to minimize the number of crossings between two layers. This
 * makes it much faster than complete methods, and produces a reasonable layout
 * in most cases, but there are some simply edge crossings that it won't
 * remove.
 *
 * It can be altered by setting both the heuristic it uses to
 * {@link DecrossTwoLayer#order} the nodes in a single layer to minimize edge
 * crossings, as well as the different {@link DecrossTwoLayer#inits} before
 * applying the two-layer heuristic. You can also tweak how many
 * {@link DecrossTwoLayer#passes} it runs. More can produce a better layout,
 * but may take longer.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().decross(decrossTwoLayer());
 * ```
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
