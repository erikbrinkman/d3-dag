/**
 * The {@link CoordGreedy} assigns nodes close to the mean of their parents,
 * then spreads them out.
 *
 * @packageDocumentation
 */
// TODO add assignment like mean that skips dummy nodes as that seems like
// better behavior
import { median } from "d3-array";
import { Coord } from ".";
import { entries, map, slice } from "../../iters";
import { err } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";

/**
 * a {@link Coord} that tries to place nodes close to their parents
 *
 * Nodes that can't be placed at the mean of their parents' location, will be
 * spaced out with their priority equal to their degree.
 *
 * Create with {@link coordGreedy}.
 */
export interface CoordGreedy extends Coord<unknown, unknown> {
  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/** assign nodes based on the median of their ancestor exes */
function assign(
  layer: readonly SugiNode[],
  ancestors: (node: SugiNode) => Iterable<SugiNode>,
): void {
  for (const node of layer) {
    const x = median([...map(ancestors(node), ({ x }) => x)]);
    if (x !== undefined) {
      node.x = x;
    }
  }
}

/** same as assign, but only for links between two dummy nodes */
function straighten(
  layer: readonly SugiNode[],
  ancestors: (node: SugiNode) => Iterable<SugiNode>,
): void {
  for (const node of layer) {
    const [ancestor] = ancestors(node);
    if (node.data.role === "link" && ancestor.data.role === "link") {
      node.x = ancestor.x;
    }
  }
}

/**
 * space apart nodes
 *
 * This spaces apart nodes using the separation function. It goes forward and
 * backward and then sets the x coordinate to be the midway point.
 */
function space<N, L>(
  layer: readonly SugiNode<N, L>[],
  sep: SugiSeparation<N, L>,
): void {
  let last = layer[layer.length - 1];
  let lastx = last.x;
  const after = [lastx];
  for (const sugi of slice(layer, layer.length - 2, -1, -1)) {
    const next = Math.min(sugi.x, lastx - sep(last, sugi));
    after.push(next);
    last = sugi;
    lastx = next;
  }

  after.reverse();
  last = layer[0];
  lastx = last.x;
  last.x = (lastx + after[0]) / 2;
  for (const [i, sugi] of entries(slice(layer, 1))) {
    const next = Math.max(sugi.x, lastx + sep(last, sugi));
    sugi.x = (next + after[i + 1]) / 2;
    last = sugi;
    lastx = next;
  }
}

/** detect if the nodes are unchanged from the snapshot */
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
 * create a new {@link CoordGreedy}
 *
 * This coordinate assignment operator tries to position nodes close to their
 * parents, but is more lenient in the constraint, so tends to be faster than
 * optimization based coordinate assignments, but runs much faster.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().coord(coordGreedy());
 * ```
 */
export function coordGreedy(...args: never[]): CoordGreedy {
  if (args.length) {
    throw err`got arguments to coordGreedy(${args}); you probably forgot to construct coordGreedy before passing to coord: \`sugiyama().coord(coordGreedy())\`, note the trailing "()"`;
  }

  function coordGreedy<N, L>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>,
  ): number {
    // get statistics on layers
    let xmean = 0;
    let xcount = 0;
    const nodes = new Set<SugiNode<N, L>>();
    for (const layer of layers) {
      for (const node of layer) {
        if (!nodes.has(node)) {
          nodes.add(node);
          if (node.ux !== undefined) {
            xmean += (node.ux - xmean) / ++xcount;
          }
        }
      }
    }

    // initialize xes on all layers
    for (const layer of layers) {
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
      space(layer, sep);
    }

    // do an up and down pass using the assignment operator
    // down pass
    for (const layer of slice(layers, 1)) {
      assign(layer, (node) => node.parents());
      space(layer, sep);
    }
    // up pass
    for (const layer of slice(layers, layers.length - 2, -1, -1)) {
      assign(layer, (node) => node.children());
      space(layer, sep);
    }

    // another set of passes to guarantee nodes spaced apart enough and long edges are straight
    for (let i = 0; i < layers.length; ++i) {
      const snapshot = layers.map((layer) => layer.map(({ x }) => x));
      for (const layer of slice(layers, 1)) {
        straighten(layer, (node) => node.parents());
        space(layer, sep);
      }
      for (const layer of slice(layers, layers.length - 2, -1, -1)) {
        straighten(layer, (node) => node.children());
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
