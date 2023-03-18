/**
 * A {@link TwolayerAgg} that orders nodes based on the aggregation of their
 * parents' or children's indices.
 *
 * @packageDocumentation
 */
import { median } from "d3-array";
import { Twolayer } from ".";
import { listMultimapPush } from "../../collections";
import { map } from "../../iters";
import { err } from "../../utils";
import { SugiNode } from "../sugify";

/**
 * an interface for aggregating numbers
 *
 * It takes an iterable of indices and returns an aggregate index.  The
 * returned value must be between the min and the max index, and only return
 * undefined if and only if indices is empty.
 */
export interface Aggregator {
  (indices: Iterable<number>): number | undefined;
}

/** a simple efficient mean aggregator */
export function aggMean(indices: Iterable<number>): number | undefined {
  let mean = 0;
  let count = 0;
  for (const val of indices) {
    count++;
    mean += (val - mean) / count;
  }
  return count ? mean : undefined;
}

/**
 * a median aggregator
 *
 * This produces close to optimal results.
 */
export function aggMedian(indices: Iterable<number>): number | undefined {
  return median([...indices]);
}

/**
 * a weighted median aggregator
 *
 * This produces close to optimal results, slightly better than median, with
 * slightly more computation time.
 */
export function aggWeightedMedian(
  indices: Iterable<number>
): number | undefined {
  const vals = [...indices];
  vals.sort((a, b) => a - b);
  if (vals.length === 0) {
    return undefined;
  } else if (vals.length === 2) {
    return (vals[0] + vals[1]) / 2;
  } else if (vals.length % 2 === 0) {
    const ind = vals.length / 2;

    const first = vals[0];
    const left = vals[ind - 1];
    const right = vals[ind];
    const last = vals[vals.length - 1];

    // all elements are guaranteed to be different, so we don't need to worry
    // about leftDiff or rightDiff being 0
    const leftDiff = left - first;
    const rightDiff = last - right;
    return (left * rightDiff + right * leftDiff) / (leftDiff + rightDiff);
  } else {
    return vals[(vals.length - 1) / 2];
  }
}

/**
 * a {@link Twolayer} that orders nodes based off aggregated ancestor indices
 *
 * This is much faster than {@link twolayerOpt}, and often produces comparable
 * or better layouts.
 * Nodes without ancestors will be placed first to minimize the distance
 * between nodes with common ancestors, and then to minimize rank inversions
 * with respect to the initial ordering.
 *
 * Create with {@link twolayerAgg}.
 */
export interface TwolayerAgg<Agg extends Aggregator = Aggregator>
  extends Twolayer<unknown, unknown> {
  /**
   * set the {@link Aggregator} for this operator
   *
   * The aggregator is used to combine the indices of ancestors to provide a
   * suitable rank for ordering. There are three built-in variants:
   * - {@link aggMean} - The simple mean of indices. This is very fast and
   *   memory efficient, but is often worse than the other two.
   * - {@link aggMedian} - Takes the median of the indices. This is often
   *   better for minimizing edge crossings than mean.
   * - {@link aggWeightedMedian} - This slightly skews the results for nodes
   *   with an even number of ancestors, that tends to be a little better than
   *   {@link aggMedian} but runs a little slower.
   *
   * (default: {@link aggWeightedMedian})
   *
   * @example
   *
   * ```ts
   * const twolayer = twolayerAgg().aggregator(aggMedian);
   * ```
   */
  aggregator<NewAgg extends Aggregator>(val: NewAgg): TwolayerAgg<NewAgg>;
  /**
   * get the current aggregator
   */
  aggregator(): Agg;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/**
 * Order a layer with respect to numeric values
 *
 * Nodes without a value will be placed in the final order with as close as
 * possible to their initial position. This is defined as the position with the
 * minimum rank inversion relative to the initial ordering.
 *
 * @remarks
 *
 * See this {@link
 * https://cs.stackexchange.com/questions/140295/complexity-to-insert-subset-of-array-to-minimize-order-inversions
 * | Stack Exchange} post for algorithmic details.
 */
function order(
  layer: SugiNode[],
  poses: Map<SugiNode, number | undefined>
): void {
  // first group by number and preserve order, this makes ties resolve to the
  // same order as layer
  const orderMap = new Map<number, SugiNode[]>();
  for (const node of layer) {
    const val = poses.get(node);
    if (val === undefined) {
      continue;
    }
    listMultimapPush(orderMap, val, node);
  }
  const ordered = [...orderMap.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, nodes]) => nodes);

  // initialize gaps for unassigned nodes
  const inds = new Map(layer.map((n, i) => [n, i] as const));
  const unassigned = layer.filter((n) => poses.get(n) === undefined);
  const placements = new Array(unassigned.length).fill(null);

  // recursively split optimal placement
  function recurse(
    ustart: number,
    uend: number,
    ostart: number,
    oend: number
  ): void {
    if (uend <= ustart) return;
    const umid = Math.floor((ustart + uend) / 2);
    const node = unassigned[umid];
    const nind = inds.get(node)!;

    let last = 0;
    const inversions = [last];
    for (let i = ostart; i < oend; ++i) {
      last += inds.get(ordered[i])! < nind ? -1 : 1;
      inversions.push(last);
    }
    const placement = ostart + inversions.indexOf(Math.min(...inversions));
    placements[umid] = placement;

    recurse(ustart, umid, ostart, placement);
    recurse(umid + 1, uend, placement, oend);
  }

  recurse(0, unassigned.length, 0, ordered.length);

  // place nodes
  placements.push(ordered.length + 1); // sentinel
  let insert = 0;
  let uind = 0;
  for (const [i, node] of ordered.entries()) {
    while (placements[uind] == i) {
      layer[insert++] = unassigned[uind++];
    }
    layer[insert++] = node;
  }
  while (placements[uind] == ordered.length) {
    layer[insert++] = unassigned[uind++];
  }
}

function buildOperator<Agg extends Aggregator>({
  aggregate,
}: {
  aggregate: Agg;
}): TwolayerAgg<Agg> {
  function twolayerAgg(
    topLayer: SugiNode[],
    bottomLayer: SugiNode[],
    topDown: boolean
  ): void {
    const [reordered, reference] = topDown
      ? [bottomLayer, topLayer]
      : [topLayer, bottomLayer];
    // NOTE this is never a multigraph, so parents are guaranteed to be unique
    const ancestors = topDown
      ? (node: SugiNode) => node.parents()
      : (node: SugiNode) => node.children();

    const inds = new Map(reference.map((node, i) => [node, i]));
    const aggs = new Map(
      reordered.map((node) => {
        const ind = inds.get(node);
        const agg = ind ?? aggregate(map(ancestors(node), (c) => inds.get(c)!));
        return [node, agg] as const;
      })
    );

    order(reordered, aggs);
  }

  function aggregator<NewAgg extends Aggregator>(
    val: NewAgg
  ): TwolayerAgg<NewAgg>;
  function aggregator(): Agg;
  function aggregator<NewAgg extends Aggregator>(
    val?: NewAgg
  ): Agg | TwolayerAgg<NewAgg> {
    if (val === undefined) {
      return aggregate;
    } else {
      return buildOperator({ aggregate: val });
    }
  }
  twolayerAgg.aggregator = aggregator;

  twolayerAgg.d3dagBuiltin = true as const;

  return twolayerAgg;
}

/**
 * create a default {@link TwolayerAgg}
 *
 * This two-layer operator is a heuristic that is very fast, but doesn't do a
 * great job at minimizing edge crossings. It works well when combined with
 * {@link twolayerGreedy}.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().decross(decrossTwoLayer().order(twolayerAgg()));
 * ```
 */
export function twolayerAgg(...args: never[]): TwolayerAgg {
  if (args.length) {
    throw err`got arguments to twolayerAgg(${args}); you probably forgot to construct twolayerAgg before passing to order: \`decrossTwoLayer().order(twolayerAgg())\`, note the trailing "()"`;
  }
  return buildOperator({ aggregate: aggWeightedMedian });
}
