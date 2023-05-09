/**
 * A {@link CoordTopological} for assigning coordinates to a topological
 * layering.
 *
 * @packageDocumentation
 */
import { Coord } from ".";
import { bigrams } from "../../iters";
import { nameSymbol } from "../../layout";
import { Constraint, solve as solveSimp, Variable } from "../../simplex";
import { err } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";
import { avgHeight, init, layout, minBend, solve as solveQuad } from "./utils";

/**
 * a {@link Coord} for positioning edges of a topological layout
 *
 * This operator can position nodes similar to {@link coordSimplex} or {@link
 * coordQuad} but is tailored to topological layouts.
 *
 * Create with {@link coordTopological}.
 */
export interface CoordTopological extends Coord<unknown, unknown> {
  /**
   * set whether to use straight edges
   *
   * If using straight edges, they'll tend to go straight down, where as curved
   * edges will have gentle slopes. `true` corresponds to {@link coordSimplex}
   * while `false` corresponds to {@link coordQuad}.
   *
   * (default: `true`)
   */
  straight(val: boolean): CoordTopological;
  /** get the current simplex setting. */
  straight(): boolean;

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly [nameSymbol]: "coordTopological";
}

function buildOperator(opts: { simp: boolean }): CoordTopological {
  function coordTopological<N, L>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>
  ): number {
    for (const layer of layers) {
      const numNodes = layer.reduce(
        (count, node) => count + +(node.data.role === "node"),
        0
      );
      if (numNodes > 1) {
        throw err`topological() only works with a topological layering, make sure you've set up sugiyama as \`sugiyama().layering(layeringTopological())\``;
      }
    }

    if (opts.simp) {
      // simplex minimization
      const variables: Record<string, Variable> = { center: {} };
      const constraints: Record<string, Constraint> = {};

      // initialize ids and non-slack variables
      const ids = new Map<SugiNode<N, L>, [string, boolean]>();
      let i = 0;
      for (const layer of layers) {
        let flip = true;
        for (const node of layer) {
          if (node.data.role === "link") {
            const id = `${i++}`;
            ids.set(node, [id, flip]);
            variables[id] = {};
          } else {
            ids.set(node, ["center", false]);
            flip = false;
          }
        }
      }

      // get ids
      const n = (node: SugiNode<N, L>): [string, boolean] => {
        return ids.get(node)!;
      };

      // layer order constraints
      for (const layer of layers) {
        for (const [left, right] of bigrams(layer)) {
          const [lid, lflip] = n(left);
          const [rid, rflip] = n(right);
          const cons = `layer ${lid} -> ${rid}`;
          const min = sep(left, right);
          constraints[cons] = { min };
          variables[lid][cons] = lflip ? 1 : -1;
          variables[rid][cons] = rflip ? -1 : 1;
        }
      }

      const heightNorm = avgHeight(ids.keys());

      // minimize weighted difference
      for (const layer of layers) {
        for (const par of layer) {
          const [pid, pflip] = n(par);
          if (pid !== "center") {
            for (const child of par.children()) {
              const [cid, cflip] = n(child);
              if (cid !== "center") {
                const slack = `link ${pid} -> ${cid}`;

                const pcons = `${slack} parent`;
                constraints[pcons] = { min: 0 };

                const ccons = `${slack} child`;
                constraints[ccons] = { min: 0 };

                variables[pid][pcons] = pflip ? -1 : 1;
                variables[pid][ccons] = pflip ? 1 : -1;

                variables[cid][pcons] = cflip ? 1 : -1;
                variables[cid][ccons] = cflip ? -1 : 1;

                const height = (child.y - par.y) / heightNorm;
                variables[slack] = { opt: 1 / height, [pcons]: 1, [ccons]: 1 };
              }
            }
          }
        }
      }

      delete variables["center"];

      const assignment = solveSimp("opt", "min", variables, constraints);

      // assign xes
      for (const [node, [id, flip]] of ids) {
        const val = assignment[id];
        node.x = val === undefined ? 0 : flip ? -val : val;
      }

      // assign x and compute offset
      let offset = 0;
      let width = 0;
      for (const layer of layers) {
        const first = layer[0];
        offset = Math.min(offset, first.x - sep(undefined, first));
        const last = layer[layer.length - 1];
        width = Math.max(width, last.x + sep(last, undefined));
      }

      // apply offset
      for (const node of ids.keys()) {
        node.x -= offset;
      }

      // compute max width
      const maxWidth = width - offset;
      if (maxWidth <= 0) {
        throw err`must assign nonzero width to at least one node; double check the callback passed to \`sugiyama().nodeSize(...)\``;
      } else {
        return maxWidth;
      }
    } else {
      // quadratic minimization
      const inds = new Map<SugiNode<N, L>, number>();
      let i = 0;
      for (const layer of layers) {
        for (const node of layer) {
          if (node.data.role === "link") {
            inds.set(node, i++);
          }
        }
      }
      // we assign all real nodes the last index, knowing that the optimization
      // always assigns them the same coord: 0.
      for (const layer of layers) {
        for (const node of layer) {
          if (node.data.role === "node") {
            inds.set(node, i);
          }
        }
      }
      const [Q, c, A, b] = init(layers, inds, sep);

      const heightNorm = avgHeight(inds.keys());

      for (const par of inds.keys()) {
        const pind = inds.get(par)!;
        for (const node of par.children()) {
          const nind = inds.get(node)!;
          const parh = (node.y - par.y) / heightNorm;
          if (node.data.role === "link") {
            for (const child of node.children()) {
              const cind = inds.get(child)!;
              const chih = (child.y - node.y) / heightNorm;
              minBend(Q, pind, nind, cind, 1 / parh, 1 / chih);
            }
          }
        }
      }

      const solution = solveQuad(Q, c, A, b);
      const width = layout(layers, sep, inds, solution);
      if (width <= 0) {
        throw err`must assign nonzero width to at least one node; double check the callback passed to \`sugiyama().nodeSize(...)\``;
      }
      return width;
    }
  }

  function straight(): boolean;
  function straight(val: boolean): CoordTopological;
  function straight(val?: boolean): boolean | CoordTopological {
    if (val === undefined) {
      return opts.simp;
    } else {
      return buildOperator({ ...opts, simp: val });
    }
  }
  coordTopological.straight = straight;

  coordTopological[nameSymbol] = "coordTopological" as const;

  return coordTopological;
}

/**
 * create a new {@link CoordTopological}
 *
 * The topological coordinate assignment operator requires a topological
 * layering created by {@link layeringTopological}. It assigns all real nodes
 * the same x coordinate, and curves the links around the column of nodes.
 *
 * It may also be worth considering {@link zherebko} as a layout as it's
 * created entirely for layouts like this.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama()
 *   .layering(layeringTopological())
 *   .coord(coordTopological());
 * ```
 */
export function coordTopological(...args: never[]): CoordTopological {
  if (args.length) {
    throw err`got arguments to coordTopological(${args}); you probably forgot to construct coordTopological before passing to coord: \`sugiyama().coord(coordTopological())\`, note the trailing "()"`;
  } else {
    return buildOperator({ simp: true });
  }
}
