/**
 * An {@link AggOperator} that orders nodes based on the aggregation of their
 * parents' or children's indices.
 *
 * @packageDocumentation
 */
import { median } from "d3-array";
import { TwolayerOperator } from ".";
import { map } from "../../iters";
import { listMultimapPush } from "../../utils";
import { SugiNode } from "../utils";

/**
 * An interface for aggregating numbers
 */
export interface Aggregator {
  /** add another value to the aggregator */
  add(inp: number): void;

  /** return the aggregate of all added values */
  val(): number | undefined;
}

/**
 * A way to create aggregators
 */
export type AggFactory<A extends Aggregator = Aggregator> = () => A;

class Mean implements Aggregator {
  private mean: number = 0.0;
  private count: number = 0;

  add(val: number): void {
    this.mean += (val - this.mean) / ++this.count;
  }

  val(): number | undefined {
    return this.count ? this.mean : undefined;
  }
}

/**
 * A {@link AggFactory | factory} that creates mean {@link Aggregator}s,
 * bundled as {@link aggMeanFactory}.
 */
export const meanFactory = (): Aggregator => new Mean();

class Median implements Aggregator {
  private vals: number[] = [];

  add(val: number): void {
    this.vals.push(val);
  }

  val(): number | undefined {
    return median(this.vals);
  }
}

/**
 * A {@link AggFactory | factory} that creates median {@link Aggregator}s,
 * bundled as {@link aggMedianFactory}.
 */
export const medianFactory = (): Aggregator => new Median();

class WeightedMedian implements Aggregator {
  private vals: number[] = [];

  add(val: number): void {
    this.vals.push(val);
  }

  val(): number | undefined {
    // NOTE this could be linear time, but we already do other sorts, so
    // probably not terrible
    this.vals.sort((a, b) => a - b);
    if (this.vals.length === 0) {
      return undefined;
    } else if (this.vals.length === 2) {
      return (this.vals[0] + this.vals[1]) / 2;
    } else if (this.vals.length % 2 === 0) {
      const ind = this.vals.length / 2;

      const first = this.vals[0];
      const left = this.vals[ind - 1];
      const right = this.vals[ind];
      const last = this.vals[this.vals.length - 1];

      // all elements are guaranteed to be different, so we don't need to worry
      // about leftDiff or rightDiff being 0
      const leftDiff = left - first;
      const rightDiff = last - right;
      return (left * rightDiff + right * leftDiff) / (leftDiff + rightDiff);
    } else {
      return this.vals[(this.vals.length - 1) / 2];
    }
  }
}

/**
 * A {@link AggFactory | factory} that creates weighted median {@link Aggregator}s,
 * bundled as {@link aggWeightedMedianFactory}.
 *
 * @remarks
 * This is slightly slower than the {@link medianFactory}.
 */
export const weightedMedianFactory = (): Aggregator => new WeightedMedian();

/**
 * A {@link TwolayerOperator} that orders nodes based off the aggregation of their
 * parents' or children's indices.
 *
 * This is much faster than {@link OptOperator}, and often produces comparable
 * or better layouts. If memory is an issue then {@link meanFactory} uses a
 * little less memory, but there is little reason to use it. Nodes without
 * parents or children respectively will be placed first to minimize the
 * distance between nodes with common parents, and then to minimize rank
 * inversions with respect to the initial ordering.
 *
 * Create with {@link agg}.
 *
 * <img alt="two layer agg example" src="media://sugi-simplex-twolayer-quad.png" width="400">
 */
export interface AggOperator<Factory extends AggFactory = AggFactory>
  extends TwolayerOperator<unknown, unknown> {
  /**
   * Set the {@link AggFactory} for this operator.
   *
   * The aggregators that this produces are used to fuse the indices of parents
   * or children of an node into it's target index for ordering. The provided
   * {@link medianFactory} works very well, but {@link meanFactory} works too,
   * as will any user provided method. (default: {@link medianFactory})
   */
  aggregator<NewFactory extends AggFactory>(
    val: NewFactory
  ): AggOperator<NewFactory>;
  /**
   * Get the current aggregator factory.
   */
  aggregator(): Factory;
}

/** perform aggregation over an iterable */
function aggregate(
  aggregator: AggFactory,
  iter: Iterable<number>
): number | undefined {
  const agg = aggregator();
  for (const val of iter) {
    agg.add(val);
  }
  return agg.val();
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

function buildOperator<Factory extends AggFactory>({
  factory,
}: {
  factory: Factory;
}): AggOperator<Factory> {
  function aggCall(
    topLayer: SugiNode[],
    bottomLayer: SugiNode[],
    topDown: boolean
  ): void {
    if (topDown) {
      const incr = new Map(
        bottomLayer.map((node) => [node, factory()] as const)
      );
      for (const [i, node] of topLayer.entries()) {
        for (const child of node.ichildren()) {
          incr.get(child)!.add(i);
        }
      }
      const aggs = new Map(
        [...incr.entries()].map(([node, agg]) => [node, agg.val()] as const)
      );
      order(bottomLayer, aggs);
    } else {
      const inds = new Map(bottomLayer.map((node, i) => [node, i] as const));
      const aggs = new Map(
        topLayer.map((node) => {
          const agg = aggregate(
            factory,
            map(node.ichildren(), (child) => inds.get(child)!)
          );
          return [node, agg] as const;
        })
      );
      order(topLayer, aggs);
    }
  }

  function aggregator<NewFactory extends AggFactory>(
    val: NewFactory
  ): AggOperator<NewFactory>;
  function aggregator(): Factory;
  function aggregator<NewFactory extends AggFactory>(
    val?: NewFactory
  ): Factory | AggOperator<NewFactory> {
    if (val === undefined) {
      return factory;
    } else {
      return buildOperator({ factory: val });
    }
  }
  aggCall.aggregator = aggregator;

  return aggCall;
}

/**
 * Create a default {@link AggOperator}, bundled as {@link twolayerAgg}.
 */
export function agg(...args: never[]): AggOperator {
  if (args.length) {
    throw new Error(
      `got arguments to agg(${args}), but constructor takes no arguments.`
    );
  }
  return buildOperator({ factory: weightedMedianFactory });
}
