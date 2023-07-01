/**
 * The {@link CoordSimplex} positions nodes to maximize line straightness.
 * This is adapted from methods used for dot layout.
 *
 * @packageDocumentation
 */
import { Coord } from ".";
import { GraphLink, GraphNode } from "../../graph";
import { bigrams, flatMap } from "../../iters";
import { Constraint, Variable, solve } from "../../simplex";
import { err, ierr } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";
import { avgHeight } from "./utils";

/**
 * a strictly callable {@link SimplexWeight}
 */
export interface CallableSimplexWeight<NodeDatum = never, LinkDatum = never> {
  /**
   * get the simplex weights for a link
   *
   * Higher weights indicate a strong preference for verticality.
   *
   * @param link - the link in question
   * @returns weights - the weights for short, medium, and long edges respectively
   */
  (link: GraphLink<NodeDatum, LinkDatum>): readonly [number, number, number];
}
/**
 * an accessor to get how vertical a weight should be.
 *
 * A weight accessor returns three postitive numbers, where higher numbers
 * indicate than edge should be more vertical. The first number corresponds to
 * short edges, the second to medium edges, and the last one to the middle of
 * long edges. These numbers should generally be increasing.
 */
export type SimplexWeight<NodeDatum = never, LinkDatum = never> =
  | readonly [number, number, number]
  | CallableSimplexWeight<NodeDatum, LinkDatum>;

/** the operators of the simplex operator */
export interface CoordSimplexOps<N = never, L = never> {
  /** the weights for each edge */
  weight: SimplexWeight<N, L>;
}

/** node datum for operators */
export type OpNodeDatum<O extends CoordSimplexOps> = O extends CoordSimplexOps<
  infer N,
  never
>
  ? N
  : never;
/** link datum for operators */
export type OpLinkDatum<O extends CoordSimplexOps> = O extends CoordSimplexOps<
  never,
  infer L
>
  ? L
  : never;

/**
 * a {@link Coord} that places nodes to maximize edge verticality
 *
 * The minimization mirrors that of Gansner, Emden R., et al. "A technique for
 * drawing directed graphs." IEEE Transactions on Software Engineering (1993).
 * This tries to make nodes close together, assigning greater weight for nodes
 * as part of an edge.
 *
 * Create with {@link coordSimplex}.
 */
export interface CoordSimplex<Ops extends CoordSimplexOps>
  extends Coord<OpNodeDatum<Ops>, OpLinkDatum<Ops>> {
  /**
   * set the weights for how vertical edges should be
   *
   * The higher the weight, the more vertical an edge should be. Weights are
   * are triplets of numbers describing the weight for different parts of edge.
   * The first is between true nodes, the second is for near true nodes, and
   * the last is for the extents of long edges. Generally the number should be
   * increasing, and all must be positive.
   *
   * (default: `[1, 2, 8]`)
   */
  weight<NewWeight extends SimplexWeight>(
    val: NewWeight
  ): CoordSimplex<{
    /** new weight */
    weight: NewWeight;
  }>;
  /** gets the current weight accessor */
  weight(): Ops["weight"];

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

function validateWeights([two, one, zero]: readonly [number, number, number]) {
  if (two <= 0 || one <= 0 || zero <= 0) {
    throw err`simplex weights must be positive, but got: ${two}, ${one}, ${zero}`;
  }
}

/**
 * create a cached weight accessor given the weight accessor and the layered dag
 *
 * This short circuits the constant operator, verifies the weights are
 * positive, and makes sure that we only call it once for each pair of nodes.
 */
function createCachedSimplexWeightAccessor<N, L>(
  layers: readonly SugiNode<N, L>[][],
  weight: SimplexWeight<N, L>
): (par: SugiNode<N, L>, child: SugiNode<N, L>) => number {
  if (typeof weight !== "function") {
    const [two, one, zero] = weight;
    return (par: SugiNode<N, L>, child: SugiNode<N, L>): number => {
      const count = +(par.data.role === "node") + +(child.data.role === "node");
      /* istanbul ignore next */
      switch (count) {
        case 0:
          return zero;
        case 1:
          return one;
        case 2:
          return two;
        default:
          /* istanbul ignore next */
          throw ierr`invalid count`;
      }
    };
  } else {
    const cache = new Map<
      GraphNode<N, L>,
      Map<GraphNode<N, L>, readonly [number, number, number]>
    >();
    for (const node of flatMap(layers, (l) => l)) {
      if (node.data.role === "node") {
        const rawNode = node.data.node;
        const targets = new Map<
          GraphNode<N, L>,
          readonly [number, number, number]
        >();

        for (const link of rawNode.childLinks()) {
          const { target } = link;
          const vals = weight(link);
          validateWeights(vals);
          targets.set(target, vals);
        }

        cache.set(rawNode, targets);
      }
    }

    return (par: SugiNode<N, L>, child: SugiNode<N, L>): number => {
      // NOTE this structure is to make sure type script does inference about
      // the sugi data appropriately
      if (par.data.role === "link") {
        const { source, target } = par.data.link;
        const [, one, two] = cache.get(source)!.get(target)!;
        return child.data.role === "link" ? two : one;
      } else if (child.data.role === "link") {
        const { source, target } = child.data.link;
        const [, val] = cache.get(source)!.get(target)!;
        return val;
      } else {
        const [val] = cache.get(par.data.node)!.get(child.data.node)!;
        return val;
      }
    };
  }
}

function buildOperator<
  NodeDatum,
  LinkDatum,
  Ops extends CoordSimplexOps<NodeDatum, LinkDatum>
>(opts: Ops & CoordSimplexOps<NodeDatum, LinkDatum>): CoordSimplex<Ops> {
  function coordSimplex<N extends NodeDatum, L extends LinkDatum>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>
  ): number {
    const variables: Record<string, Variable> = {};
    const constraints: Record<string, Constraint> = {};

    const cachedWeight = createCachedSimplexWeightAccessor(layers, opts.weight);

    // initialize ids and non-slack variables
    const ids = new Map<SugiNode<N, L>, string>();
    let i = 0;
    for (const layer of layers) {
      for (const node of layer) {
        if (!ids.has(node)) {
          const id = `${i++}`;
          ids.set(node, id);
          variables[id] = {};
        }
      }
    }

    /** get node id */
    function n(node: SugiNode<N, L>): string {
      return ids.get(node)!;
    }

    // layer order constraints
    for (const layer of layers) {
      for (const [left, right] of bigrams(layer)) {
        const lid = n(left);
        const rid = n(right);
        const cons = `layer ${lid} -> ${rid}`;
        const separ = sep(left, right);
        constraints[cons] = { min: separ };
        variables[lid][cons] = -1;
        variables[rid][cons] = 1;
      }
    }

    const heightNorm = avgHeight(ids.keys());

    // minimize weighted difference
    for (const node of ids.keys()) {
      const nid = n(node);
      for (const child of node.children()) {
        const cid = n(child);
        const slack = `link ${nid} -> ${cid}`;

        const pcons = `${slack} parent`;
        constraints[pcons] = { min: 0 };

        const ccons = `${slack} child`;
        constraints[ccons] = { min: 0 };

        variables[nid][pcons] = 1;
        variables[nid][ccons] = -1;

        variables[cid][pcons] = -1;
        variables[cid][ccons] = 1;

        const weight = cachedWeight(node, child);
        const height = (child.y - node.y) / heightNorm;
        variables[slack] = { opt: weight / height, [pcons]: 1, [ccons]: 1 };
      }
    }

    const assignment = solve("opt", "min", variables, constraints);

    // assign initial xes
    for (const [node, id] of ids) {
      node.x = assignment[id] ?? 0;
    }

    // figure out width and offset
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

    // return width
    const maxWidth = width - offset;
    if (maxWidth <= 0) {
      throw err`must assign nonzero width to at least one node; double check the callback passed to \`sugiyama().nodeSize(...)\``;
    } else {
      return maxWidth;
    }
  }

  function weight<NewWeight extends SimplexWeight>(
    val: NewWeight
  ): CoordSimplex<{
    weight: NewWeight;
  }>;
  function weight(): Ops["weight"];
  function weight<NewWeight extends SimplexWeight>(
    val?: NewWeight
  ):
    | CoordSimplex<{
        weight: NewWeight;
      }>
    | Ops["weight"] {
    if (val === undefined) {
      return opts.weight;
    } else {
      if (typeof val !== "function") {
        validateWeights(val);
      }
      const { weight: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        weight: val,
      });
    }
  }
  coordSimplex.weight = weight;

  coordSimplex.d3dagBuiltin = true as const;

  return coordSimplex;
}

/** default simplex operator */
export type DefaultCoordSimplex = CoordSimplex<{
  /** default weights taken from graphvis */
  weight: readonly [1, 2, 8];
}>;

/**
 * create a default {@link CoordSimplex}
 *
 * The simplex coordinate assignment operator tries to minimize edge length,
 * while also trying to make long edges vertical. This uses an optimization
 * that can take a long time, but is usually fast enough on moderately sized
 * graphs.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().coord(coordSimplex().weight([2, 2, 4]));
 * ```
 */
export function coordSimplex(...args: never[]): DefaultCoordSimplex {
  if (args.length) {
    throw err`got arguments to coordSimplex(${args}); you probably forgot to construct coordSimplex before passing to coord: \`sugiyama().coord(coordSimplex())\`, note the trailing "()"`;
  } else {
    return buildOperator({
      weight: [1, 2, 8] as const,
    });
  }
}
