/**
 * a {@link TwolayerGreedy} that calls another {@link Twolayer} before greedily
 * swapping nodes to minimize crossings.
 *
 * @packageDocumentation
 */
import { Twolayer } from ".";
import { nameSymbol } from "../../layout";
import { err } from "../../utils";
import { SugiNode } from "../sugify";

/**
 * a {@link Twolayer} that greedily swaps nodes
 *
 * Create with {@link twolayerGreedy}.
 */
export interface TwolayerGreedy<Op extends Twolayer = Twolayer>
  extends Twolayer<
    Op extends Twolayer<infer N, never> ? N : never,
    Op extends Twolayer<never, infer L> ? L : never
  > {
  /**
   * set the base {@link Twolayer} for this operator
   *
   * Greedy will first call its base operator, and the greedily swap nodes to
   * minimize edge crossings. To only greedily minimize edge crossings, set
   * base to a no op.
   *
   * (default: noop)
   */
  base<NewOp extends Twolayer>(val: NewOp): TwolayerGreedy<NewOp>;
  /**
   * get the current base operator
   */
  base(): Op;

  /**
   * set whether this operator should scan to find swaps.
   *
   * Using the scan method takes longer (quadratic in layer size, versus
   * linear), but produces fewer crossings.
   *
   * (default: `false`)
   */
  scan(val: boolean): TwolayerGreedy<Op>;
  /**
   * get the current scan setting
   */
  scan(): boolean;

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly [nameSymbol]: "twolayerGreedy";
}

interface SwapChange<N, L> {
  (left: SugiNode<N, L>, right: SugiNode<N, L>): number;
}

function createSwapChange<N, L>(
  stationary: readonly SugiNode<N, L>[],
  children: (node: SugiNode<N, L>) => Iterable<[SugiNode<N, L>, number]>
): SwapChange<N, L> {
  const cache = new Map<SugiNode, Map<SugiNode, number>>();
  const inds = new Map<SugiNode, number>(stationary.map((n, i) => [n, i]));

  function swapChange(left: SugiNode<N, L>, right: SugiNode<N, L>): number {
    const val = cache.get(left)?.get(right);
    if (val !== undefined) {
      return val; // cached
    } else if (inds.has(left) || inds.has(right)) {
      return -Infinity; // can't swap compact nodes
    } else {
      let delta = 0;
      for (const [cl, nl] of children(left)) {
        const il = inds.get(cl)!;
        for (const [cr, nr] of children(right)) {
          const ir = inds.get(cr)!;
          delta += Math.sign(il - ir) * nl * nr;
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
      const temp = layer[ind + 1];
      layer[ind + 1] = layer[ind];
      layer[ind] = temp;
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
    const temp = layer[toInd];
    layer[toInd] = layer[fromInd];
    layer[fromInd] = temp;
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

    const layer = topDown ? bottomLayer : topLayer;
    const swapChange = topDown
      ? createSwapChange(topLayer, (node) => node.parentCounts())
      : createSwapChange(bottomLayer, (node) => node.childCounts());

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

  twolayerGreedy[nameSymbol] = "twolayerGreedy" as const;

  return twolayerGreedy;
}

/** default greedy operator */
export type DefaultTwolayerGreedy = TwolayerGreedy<Twolayer<unknown, unknown>>;

/**
 * create a default {@link TwolayerGreedy}
 *
 * This may be faster than {@link twolayerOpt}, but should produce better
 * layouts than {@link twolayerAgg} on its own.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().decross(decrossTwoLayer().order(twolayerGreedy()));
 * ```
 */
export function twolayerGreedy(...args: never[]): DefaultTwolayerGreedy {
  if (args.length) {
    throw err`got arguments to twolayerGreedy(${args}); you probably forgot to construct twolayerGreedy before passing to order: \`decrossTwoLayer().order(twolayerGreedy())\`, note the trailing "()"`;
  }
  return buildOperator({ baseOp: () => undefined, doScan: false });
}
