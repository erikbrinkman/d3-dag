/**
 * An {@link TwolayerGreedy} that calls another {@link sugiyama/twolayer!Twolayer} before
 * greedily swapping nodes to minimize crossings.
 *
 * @packageDocumentation
 */
import { Twolayer } from ".";
import { err } from "../../utils";
import { SugiNode } from "../sugify";

/** the node datum of a set of operators */
export type OpNodeDatum<Op extends Twolayer> = Op extends Twolayer<
  infer D,
  never
>
  ? D
  : never;
/** the link datum of a set of operators */
export type OpLinkDatum<Op extends Twolayer> = Op extends Twolayer<
  never,
  infer L
>
  ? L
  : never;

/**
 * A {@link sugiyama/twolayer!Twolayer} that first calls a base twolayer operator, then
 * greedily swaps nodes to minimize crossings.
 *
 * This may be faster than {@link sugiyama/twolayer/opt!TwolayerOpt},
 * but should produce better layouts than {@link sugiyama/twolayer/agg!TwolayerAgg}.
 *
 * Create with {@link twolayerGreedy}.
 */
export interface TwolayerGreedy<Op extends Twolayer = Twolayer>
  extends Twolayer<OpNodeDatum<Op>, OpLinkDatum<Op>> {
  /**
   * Set the {@link sugiyama/twolayer!Twolayer} for this operator.
   *
   * This operator will first call its base operator, and the greedily swap
   * nodes to minimize edge crossings. To only greedily minimize edge
   * crossings, set base to a no op.
   */
  base<NewOp extends Twolayer>(val: NewOp): TwolayerGreedy<NewOp>;
  /**
   * Get the current base operator.
   */
  base(): Op;

  /**
   * Set whether this operator should scan to find swaps.
   *
   * Using the scan method takes longer (quadratic in layer size, versus
   * linear), but produces fewer crossings.
   */
  scan(val: boolean): TwolayerGreedy<Op>;
  /**
   * Get the current base operator.
   */
  scan(): boolean;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

interface SwapChange<N, L> {
  (left: SugiNode<N, L>, right: SugiNode<N, L>): number;
}

function createSwapChange<N, L>(
  stationary: readonly SugiNode<N, L>[],
  children: (node: SugiNode<N, L>) => Iterable<SugiNode<N, L>>
): SwapChange<N, L> {
  const cache = new Map<SugiNode, Map<SugiNode, number>>();
  const inds = new Map<SugiNode, number>(stationary.map((n, i) => [n, i]));

  function swapChange(left: SugiNode<N, L>, right: SugiNode<N, L>): number {
    const val = cache.get(left)?.get(right);
    if (val !== undefined) {
      return val;
    } else {
      let delta = 0;
      for (const cl of children(left)) {
        for (const cr of children(right)) {
          delta += Math.sign(inds.get(cl)! - inds.get(cr)!);
        }
      }

      const cacheLeft = cache.get(left);
      if (cacheLeft === undefined) {
        cache.set(left, new Map([[right, delta]]));
      } else {
        cacheLeft.set(right, delta);
      }

      const cacheRight = cache.get(right);
      if (cacheRight === undefined) {
        cache.set(right, new Map([[left, -delta]]));
      } else {
        cacheRight.set(left, -delta);
      }

      return delta;
    }
  }

  return swapChange;
}

function adjacentSwap<N, L>(
  layer: SugiNode<N, L>[],
  swapChange: SwapChange<N, L>
): void {
  const ranges: [number, number][] = [[0, layer.length]];
  let range;
  while ((range = ranges.pop())) {
    const [start, end] = range;
    if (start >= end) continue;
    let max = 0;
    let ind = end;
    for (let i = start; i < end - 1; ++i) {
      const diff = swapChange(layer[i], layer[i + 1]);
      if (diff > max) {
        max = diff;
        ind = i;
      }
    }
    if (ind !== end) {
      [layer[ind], layer[ind + 1]] = [layer[ind + 1], layer[ind]];
      ranges.push([start, ind], [ind + 2, end]);
    }
  }
}

function scanSwap<N, L>(
  layer: SugiNode<N, L>[],
  swapChange: SwapChange<N, L>
): void {
  const costs: number[] = Array<number>(
    (layer.length * (layer.length - 1)) / 2
  );
  for (;;) {
    let start = 0;
    for (let ti = 1; ti < layer.length; ++ti) {
      let cum = 0;
      let ind = start;
      for (let fi = ti - 1; fi >= 0; --fi) {
        costs[ind] = cum;
        cum += swapChange(layer[fi], layer[ti]);
        ind -= layer.length - fi - 1;
      }
      start += layer.length - ti;
    }

    let ind = 0;
    let max = 0;
    let fromInd = 0;
    let toInd = 0;
    for (let fi = 0; fi < layer.length - 1; ++fi) {
      let cum = 0;
      for (let ti = fi + 1; ti < layer.length; ++ti) {
        cum += swapChange(layer[fi], layer[ti]);
        const val = costs[ind++] + cum;
        if (val > max) {
          max = val;
          fromInd = fi;
          toInd = ti;
        }
      }
    }

    // no more swaps;
    if (max === 0) break;
    // else do swap and try again
    [layer[fromInd], layer[toInd]] = [layer[toInd], layer[fromInd]];
  }
}

function buildOperator<N, L, Op extends Twolayer<N, L>>({
  baseOp,
  doScan,
}: {
  baseOp: Op & Twolayer<N, L>;
  doScan: boolean;
}): TwolayerGreedy<Op> {
  function twolayerGreedy(
    topLayer: SugiNode<N, L>[],
    bottomLayer: SugiNode<N, L>[],
    topDown: boolean
  ): void {
    baseOp(topLayer, bottomLayer, topDown);

    let layer, swapChange;
    if (topDown) {
      swapChange = createSwapChange(topLayer, (node: SugiNode<N, L>) =>
        node.parents()
      );
      layer = bottomLayer;
    } else {
      swapChange = createSwapChange(bottomLayer, (node: SugiNode) =>
        node.children()
      );
      layer = topLayer;
    }

    if (doScan) {
      scanSwap(layer, swapChange);
    } else {
      adjacentSwap(layer, swapChange);
    }
  }

  function base<NewOp extends Twolayer>(val: NewOp): TwolayerGreedy<NewOp>;
  function base(): Op;
  function base<NewOp extends Twolayer>(
    val?: NewOp
  ): Op | TwolayerGreedy<NewOp> {
    if (val === undefined) {
      return baseOp;
    } else {
      return buildOperator({ baseOp: val, doScan });
    }
  }
  twolayerGreedy.base = base;

  function scan(val: boolean): TwolayerGreedy<Op>;
  function scan(): boolean;
  function scan(val?: boolean): boolean | TwolayerGreedy<Op> {
    if (val === undefined) {
      return doScan;
    } else {
      return buildOperator({ baseOp, doScan: val });
    }
  }
  twolayerGreedy.scan = scan;

  twolayerGreedy.d3dagBuiltin = true as const;

  return twolayerGreedy;
}

/** default greedy operator */
export type DefaultTwolayerGreedy = TwolayerGreedy<Twolayer<unknown, unknown>>;

/**
 * Create a default {@link TwolayerGreedy}
 *
 * - {@link TwolayerGreedy#base | `base()`}: noop
 * - {@link TwolayerGreedy#scan | `scan()`}: `false`
 */
export function twolayerGreedy(...args: never[]): DefaultTwolayerGreedy {
  if (args.length) {
    throw err`got arguments to twolayerGreedy(${args}); you probably forgot to construct twolayerGreedy before passing to order: \`decrossTwoLayer().order(twolayerGreedy())\`, note the trailing "()"`;
  }
  return buildOperator({ baseOp: () => undefined, doScan: false });
}
