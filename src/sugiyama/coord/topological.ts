/**
 * A {@link CoordTopological} for assigning coordinates to a topological
 * layering.
 *
 * @packageDocumentation
 */
import { Coord } from ".";
import { bigrams, flatMap } from "../../iters";
import { Constraint, solve as solveSimp, Variable } from "../../simplex";
import { err } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";
import { init, layout, minBend, solve as solveQuad } from "./utils";

/**
 * A {@link sugiyama/coord!Coord} for positioning edges of a topological layout.
 *
 * This operators also minimized a quadratic objective function (similar to
 * {@link sugiyama/coord/quad!CoordQuad}), but is tailored to topological layouts.
 *
 * Create with {@link coordTopological}.
 *
 * <img alt="topological example" src="media://sugi-topological-opt-topological.png" width="1000">
 */
export interface CoordTopological extends Coord<unknown, unknown> {
  /**
   * Set whether to use straight edges
   *
   * If using straight edges, they'll tend to go straight down, where as curved
   * edges will have gentle slopes. (default: true)
   */
  straight(val: boolean): CoordTopological;
  /** Get the current simplex setting. */
  straight(): boolean;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

function buildOperator(opts: { simp: boolean }): CoordTopological {
  function coordTopological<N, L>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>
  ): number {
    for (const layer of layers) {
      const numNodes = layer.reduce(
        (count, node) => count + +("node" in node.data),
        0
      );
      if (numNodes > 1) {
        throw err`topological() only works with a topological layering, make sure you've set up sugiyama as \`sugiyama().layering(layeringTopological())\``;
      }
    }

    if (opts.simp) {
      const variables: Record<string, Variable> = { center: {} };
      const constraints: Record<string, Constraint> = {};

      // initialize ids and non-slack variables
      const ids = new Map<SugiNode<N, L>, [string, boolean]>();
      let i = 0;
      for (const layer of layers) {
        let flip = true;
        for (const node of layer) {
          if ("link" in node.data) {
            const id = (i++).toString();
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

      // minimize weighted difference
      for (const par of flatMap(layers, (l) => l)) {
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

              variables[slack] = { opt: 1, [pcons]: 1, [ccons]: 1 };
            }
          }
        }
      }

      delete variables["center"];

      const assignment = solveSimp("opt", "min", variables, constraints);
      let offset = 0;
      let width = 0;
      for (const layer of layers) {
        for (const node of layer) {
          const [id, flip] = n(node);
          const val = assignment[id];
          node.x = val === undefined ? 0 : flip ? -val : val;
        }
        const first = layer[0];
        offset = Math.min(offset, first.x - sep(undefined, first));
        const last = layer[layer.length - 1];
        width = Math.max(width, last.x + sep(last, undefined));
      }
      for (const node of flatMap(layers, (l) => l)) {
        node.x -= offset;
      }
      const maxWidth = width - offset;
      if (maxWidth <= 0) {
        throw err`must assign nonzero width to at least one node; double check the callback passed to \`sugiyama().nodeSize(...)\``;
      } else {
        return maxWidth;
      }
    } else {
      const inds = new Map<SugiNode<N, L>, number>();
      let i = 0;
      for (const layer of layers) {
        for (const node of layer) {
          if (!("node" in node.data)) {
            inds.set(node, i++);
          }
        }
      }
      // we assign all real nodes the last index, knowing that the optimization
      // always assigns them the same coord: 0.
      for (const layer of layers) {
        for (const node of layer) {
          if ("node" in node.data) {
            inds.set(node, i);
          }
        }
      }
      const [Q, c, A, b] = init(layers, inds, sep);

      for (const layer of layers) {
        for (const par of layer) {
          const pind = inds.get(par)!;
          for (const node of par.children()) {
            const nind = inds.get(node)!;
            if ("link" in node.data) {
              for (const child of node.children()) {
                const cind = inds.get(child)!;
                minBend(Q, pind, nind, cind, 1);
              }
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

  coordTopological.d3dagBuiltin = true as const;

  return coordTopological;
}

/**
 * Create a new {@link CoordTopological}
 *
 * - {@link CoordTopological#straight | `straight()`}: `true`
 */
export function coordTopological(...args: never[]): CoordTopological {
  if (args.length) {
    throw err`got arguments to coordTopological(${args}); you probably forgot to construct coordTopological before passing to coord: \`sugiyama().coord(coordTopological())\`, note the trailing "()"`;
  } else {
    return buildOperator({ simp: true });
  }
}
