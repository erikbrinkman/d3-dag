/**
 * The {@link CoordGreedy} assigns nodes close to the mean of their parents,
 * then spreads them out.
 *
 * @packageDocumentation
 */
// TODO add assignment like mean that skips dummy nodes as that seems like
// better behavior
import { Coord } from ".";
import { bigrams, entries, map, slice } from "../../iters";
import { err } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";
import { aggMedian, Aggregator } from "../twolayer/agg";

/**
 * A {@link sugiyama/coord!Coord} that tries to place nodes close to their parents
 *
 * Nodes that can't be placed at the mean of their parents' location, will be
 * spaced out with their priority equal to their degree.
 *
 * Create with {@link coordGreedy}.
 *
 * <img alt="greedy example" src="media://sugi-simplex-opt-greedy.png" width="400">
 */
export interface CoordGreedy extends Coord<unknown, unknown> {
  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

function degree(node: SugiNode): number {
  return node.data.role === "node" ? node.nparents() + node.nchildren() : -1;
}

function assign(
  layer: readonly SugiNode[],
  agg: Aggregator,
  counts: (node: SugiNode) => Iterable<readonly [SugiNode, number]>
): void {
  for (const node of layer) {
    const x = agg(map(counts(node), ([{ x }, num]) => [x, num]));
    if (x !== undefined) {
      node.x = x;
    }
  }
}

function heur<N, L>(
  layer: readonly SugiNode<N, L>[],
  sep: SugiSeparation<N, L>,
  inds: readonly number[]
): void {
  // iterate over nodes in degree order
  for (const ind of inds) {
    // space apart in neighborhood
    for (const [last, next] of bigrams(slice(layer, ind))) {
      const x = last.x + sep(last, next);
      if (x > next.x) {
        next.x = x;
      } else {
        break;
      }
    }
    for (const [last, next] of bigrams(slice(layer, ind, -1, -1))) {
      const x = last.x - sep(next, last);
      if (x < next.x) {
        next.x = x;
      } else {
        break;
      }
    }
  }
}

function space<N, L>(
  layer: readonly SugiNode<N, L>[],
  sep: SugiSeparation<N, L>
): void {
  const ind = Math.floor(layer.length / 2);
  for (const [last, next] of bigrams(slice(layer, ind))) {
    next.x = Math.max(next.x, last.x + sep(last, next));
  }
  for (const [last, next] of bigrams(slice(layer, ind, -1, -1))) {
    next.x = Math.min(next.x, last.x - sep(next, last));
  }
}

function unchanged(layers: SugiNode[][], snapshot: number[][]): boolean {
  for (const [i, layer] of layers.entries()) {
    const snap = snapshot[i];
    for (const [j, { x }] of layer.entries()) {
      if (snap[j] !== x) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Create a new {@link CoordGreedy}
 */
export function coordGreedy(...args: never[]): CoordGreedy {
  if (args.length) {
    throw err`got arguments to coordGreedy(${args}); you probably forgot to construct coordGreedy before passing to coord: \`sugiyama().coord(coordGreedy())\`, note the trailing "()"`;
  }

  function coordGreedy<N, L>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>
  ): number {
    // TODO allow other aggregations
    const agg = aggMedian;

    // get statistics on layers
    let numPasses = 1;
    let xmean = 0;
    let xcount = 0;
    const nodes = new Set<SugiNode<N, L>>();
    for (const layer of layers) {
      for (const node of layer) {
        nodes.add(node);
        if (node.ux !== undefined) {
          xmean += (node.ux - xmean) / ++xcount;
        }
        if (node.data.role === "node") {
          const span = node.data.bottomLayer - node.data.topLayer + 1;
          numPasses = Math.max(numPasses, span);
        }
      }
    }

    // compute order for spacing heuristic
    const degInds = layers.map((layer) => {
      const ordered = [...layer.entries()];
      ordered.sort(([aj, anode], [bj, bnode]) => {
        const adeg = degree(anode);
        const bdeg = degree(bnode);
        return adeg === bdeg ? aj - bj : bdeg - adeg;
      });
      return ordered.map(([ind]) => ind);
    });

    // initialize xes on all layers
    for (const [i, layer] of layers.entries()) {
      let mean = 0;
      let count = 0;
      for (const node of layer) {
        if (node.ux !== undefined) {
          mean += (node.ux - mean) / ++count;
        }
      }
      const def = count ? mean : xmean;
      for (const node of layer) {
        if (node.ux === undefined) {
          node.ux = def;
        }
      }
      heur(layer, sep, degInds[i]);
    }

    // do an up and down pass using the assignment operator
    // down pass
    for (const [i, layer] of entries(slice(layers, 1))) {
      assign(layer, agg, (node) => node.parentCounts());
      heur(layer, sep, degInds[i + 1]);
    }
    // up pass
    for (const [i, layer] of entries(
      slice(layers, layers.length - 2, -1, -1)
    )) {
      assign(layer, agg, (node) => node.childCounts());
      heur(layer, sep, degInds[layers.length - i - 2]);
    }

    // another set of passes to guarantee nodes spaced apart enough
    for (let i = 0; i < numPasses; ++i) {
      const snapshot = layers.map((layer) => layer.map(({ x }) => x));
      for (const layer of slice(layers, 1)) {
        space(layer, sep);
      }
      for (const layer of slice(layers, layers.length - 2, -1, -1)) {
        space(layer, sep);
      }
      if (unchanged(layers, snapshot)) {
        break;
      }
    }

    // figure out width and offset
    let start = Infinity;
    let end = -Infinity;
    for (const layer of layers) {
      const first = layer[0];
      start = Math.min(start, first.x - sep(undefined, first));
      const last = layer[layer.length - 1];
      end = Math.max(end, last.x + sep(last, undefined));
    }

    // apply offset
    for (const node of nodes) {
      node.x -= start;
    }

    const width = end - start;
    if (width <= 0) {
      throw err`must assign nonzero width to at least one node; double check the callback passed to \`sugiyama().nodeSize(...)\``;
    }
    return width;
  }

  coordGreedy.d3dagBuiltin = true as const;

  return coordGreedy;
}
