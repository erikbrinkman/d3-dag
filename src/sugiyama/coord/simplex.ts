/**
 * The {@link CoordSimplex} positions nodes to maximize line straightness.
 * This is adapted from methods used for dot layout.
 *
 * @packageDocumentation
 */
import { Coord } from ".";
import { GraphLink, GraphNode } from "../../graph";
import { bigrams, entries, flatMap } from "../../iters";
import { Constraint, solve, Variable } from "../../simplex";
import { err, ierr } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";

/**
 * A strictly callable {@link SimplexWeight}
 */
export interface CallableSimplexWeight<NodeDatum = never, LinkDatum = never> {
  (link: GraphLink<NodeDatum, LinkDatum>): readonly [number, number, number];
}
/**
 * An accessor to get how vertical a weight should be.
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
export interface Operators<N = never, L = never> {
  /** the weights for each edge */
  weight: SimplexWeight<N, L>;
}

/** node datum for operators */
export type OpNodeDatum<O extends Operators> = O extends Operators<
  infer N,
  never
>
  ? N
  : never;
/** link datum for operators */
export type OpLinkDatum<O extends Operators> = O extends Operators<
  never,
  infer L
>
  ? L
  : never;

/**
 * A {@link sugiyama/coord!Coord} that places nodes to maximize edge verticality
 *
 * The minimization mirrors that of Gansner, Emden R., et al. "A technique for
 * drawing directed graphs." IEEE Transactions on Software Engineering (1993).
 * This tries to make nodes close together, assigning greater weight for nodes
 * as part of an edge.
 *
 * Create with {@link coordSimplex}.
 *
 * <img alt="quad example" src="media://sugi-simplex-twolayer-simplex.png" width="400">
 */
export interface CoordSimplex<Ops extends Operators>
  extends Coord<OpNodeDatum<Ops>, OpLinkDatum<Ops>> {
  /**
   * Set the weights for how vertical edges should be.
   * The higher the weight, the more vertical an edge should be. Weights are
   * are triplets of numbers describing the weight for different parts of edge.
   * The first is between true nodes, the second is for near true nodes, and
   * the last is for the extents of long edges. Generally the number should be
   * increasing, and all must be positive. (default: () =\> [1, 2, 8])
   */
  weight<NewWeight extends SimplexWeight>(
    val: NewWeight
  ): CoordSimplex<{
    /** new weight */
    weight: NewWeight;
  }>;
  /** Gets the current weight accessor */
  weight(): Ops["weight"];

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
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
      const count = +("node" in par.data) + +("node" in child.data);
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
      if ("node" in node.data) {
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
      if ("link" in par.data) {
        const { source, target } = par.data.link;
        const [, one, two] = cache.get(source)!.get(target)!;
        return "link" in child.data ? two : one;
      } else if ("link" in child.data) {
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
  Ops extends Operators<NodeDatum, LinkDatum>
>(opts: Ops & Operators<NodeDatum, LinkDatum>): CoordSimplex<Ops> {
  function coordSimplex<N extends NodeDatum, L extends LinkDatum>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>
  ): number {
    const variables: Record<string, Variable> = {};
    const constraints: Record<string, Constraint> = {};

    const cachedWeight = createCachedSimplexWeightAccessor(layers, opts.weight);

    // initialize ids and non-slack variables
    const ids = new Map<SugiNode<N, L>, string>();
    for (const [i, node] of entries(flatMap(layers, (l) => l))) {
      const id = i.toString();
      ids.set(node, id);
      variables[id] = {};
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

    // minimize weighted difference
    for (const node of flatMap(layers, (l) => l)) {
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
        variables[slack] = { opt: weight, [pcons]: 1, [ccons]: 1 };
      }
    }

    const assignment = solve("opt", "min", variables, constraints);
    let offset = 0;
    let width = 0;
    for (const layer of layers) {
      for (const node of layer) {
        node.x = assignment[n(node)] ?? 0;
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
 * Create a default {@link CoordSimplex}
 *
 * - {@link CoordSimplex#weight | `weight()`}: `[1, 2, 8]`
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
