/**
 * The {@link SimplexOperator} positions nodes to maximize line straightness.
 * This is adapted from methods used for dot layout.
 *
 * @module
 */
import { CoordNodeSizeAccessor, CoordOperator } from ".";
import { DagLink } from "../../dag";
import { entries, flatMap } from "../../iters";
import { Constraint, solve, Variable } from "../../simplex";
import { bigrams } from "../../utils";
import { SugiNode } from "../utils";
import { componentMap, splitComponentLayers } from "./utils";

/**
 * An accessor to get how vertical a weight should be.
 *
 * A weight accessor returns three postitive numbers, where higher numbers
 * indicate than edge should be more vertical. The first number corresponds to
 * short edges, the second to medium edges, and the last one to the middle of
 * long edges. These numbers should generally be increasing.
 */
export interface WeightAccessor<NodeDatum = never, LinkDatum = never> {
  (link: DagLink<NodeDatum, LinkDatum>): readonly [number, number, number];
}

/**
 * a {@link WeightAccessor} that returns a constant value
 *
 * If using a constant value, this provides some small memory and time savings
 * over a regular accessor.
 */
export interface ConstAccessor<
  T extends readonly [number, number, number] = readonly [
    number,
    number,
    number
  ]
> extends WeightAccessor<unknown, unknown> {
  value: Readonly<T>;
  (): T;
}

/**
 * a function for creating a {@link ConstAccessor}
 */
export function createConstAccessor<
  T extends readonly [number, number, number]
>(value: T): ConstAccessor<T> {
  const [a, b, c] = value;
  if (a <= 0 || b <= 0 || c <= 0) {
    throw new Error("const accessors should return non-negative values");
  }
  const accessor = () => value;
  accessor.value = value;
  return accessor;
}

/**
 * If an accessor is a const accessor
 */
function isConstAccessor(
  acc: WeightAccessor | ConstAccessor
): acc is ConstAccessor {
  return (
    "value" in acc &&
    typeof acc.value === "object" &&
    acc.value.length === 3 &&
    acc.value.every((v) => typeof v === "number")
  );
}

interface Operators<N = never, L = never> {
  weight: WeightAccessor<N, L>;
}

type OpNodeDatum<O extends Operators> = O extends Operators<infer N, never>
  ? N
  : never;
type OpLinkDatum<O extends Operators> = O extends Operators<never, infer L>
  ? L
  : never;

/**
 * A {@link CoordOperator} that places nodes to maximize edge verticality
 *
 * The minimization mirrors that of Gansner, Emden R., et al. "A technique for
 * drawing directed graphs." IEEE Transactions on Software Engineering (1993).
 * This tries to make nodes close together, assigning greater weight for nodes
 * as part of an edge.
 *
 * Create with {@link simplex}.
 *
 * <img alt="quad example" src="media://sugi-simplex-twolayer-simplex.png" width="400">
 */
export interface SimplexOperator<Ops extends Operators>
  extends CoordOperator<OpNodeDatum<Ops>, OpLinkDatum<Ops>> {
  /**
   * Set the weights for how vertical edges should be.
   * The higher the weight, the more vertical an edge should be. Weights are
   * are triplets of numbers describing the weight for different parts of edge.
   * The first is between true nodes, the second is for near true nodes, and
   * the last is for the extents of long edges. Generally the number should be
   * increasing, and all must be positive. (default: () => [1, 2, 8])
   */
  weight<NewWeight extends WeightAccessor>(
    val: NewWeight
  ): SimplexOperator<{
    weight: NewWeight;
  }>;
  /** Gets the current weight accessor */
  weight(): Ops["weight"];
}

/**
 * create a cached weight accessor given the weight accessor and the layered dag
 *
 * This short circuits the constant operator, verifies the weights are
 * positive, and makes sure that we only call it once for each pair of nodes.
 */
function createCachedWeightAccessor<N, L>(
  layers: readonly SugiNode<N, L>[][],
  weight: WeightAccessor<N, L>
): (par: SugiNode<N, L>, child: SugiNode<N, L>) => number {
  if (isConstAccessor(weight)) {
    const [two, one, zero] = weight.value;
    if (two <= 0 || one <= 0 || zero <= 0) {
      throw new Error(
        `simplex weights must be positive, but got: ${two}, ${one}, ${zero}`
      );
    }

    const cached = (par: SugiNode<N, L>, child: SugiNode<N, L>): number => {
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
          throw new Error("internal error");
      }
    };

    return cached;
  } else {
    const cache = new Map();
    for (const node of flatMap(layers, (l) => l)) {
      if ("node" in node.data) {
        const rawNode = node.data.node;
        const targets = new Map();

        for (const link of rawNode.ichildLinks()) {
          const { target } = link;
          const vals = weight(link);
          const [zero, one, two] = vals;
          if (zero <= 0 || one <= 0 || two <= 0) {
            throw new Error(
              `simplex weights must be positive, but got: ${zero}, ${one}, ${two}`
            );
          }
          targets.set(target, vals);
        }

        cache.set(rawNode, targets);
      }
    }

    const cached = (par: SugiNode<N, L>, child: SugiNode<N, L>): number => {
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

    return cached;
  }
}

function buildOperator<
  NodeDatum,
  LinkDatum,
  Ops extends Operators<NodeDatum, LinkDatum>
>(opts: Ops & Operators<NodeDatum, LinkDatum>): SimplexOperator<Ops> {
  function simplexComponent<N extends NodeDatum, L extends LinkDatum>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>
  ): number {
    const variables: Record<string, Variable> = {};
    const constraints: Record<string, Constraint> = {};

    const cachedWeight = createCachedWeightAccessor(layers, opts.weight);

    // initialize ids and non-slack variables
    const ids = new Map();
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
        const width = (nodeSize(left) + nodeSize(right)) / 2;
        constraints[cons] = { min: width };
        variables[lid][cons] = -1;
        variables[rid][cons] = 1;
      }
    }

    // minimize weighted difference
    for (const node of flatMap(layers, (l) => l)) {
      const nid = n(node);
      for (const child of node.ichildren()) {
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
      offset = Math.min(offset, first.x! - nodeSize(first) / 2);
      const last = layer[layer.length - 1];
      width = Math.max(width, last.x! + nodeSize(last) / 2);
    }
    for (const node of flatMap(layers, (l) => l)) {
      node.x! -= offset;
    }
    return width - offset;
  }

  function simplexCall<N extends NodeDatum, L extends LinkDatum>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>
  ): number {
    // split components
    const compMap = componentMap(layers);
    const components = splitComponentLayers(layers, compMap);

    // layout each component and get width
    const widths = components.map((compon) =>
      simplexComponent(compon, nodeSize)
    );

    // center components
    const maxWidth = Math.max(...widths);
    if (maxWidth <= 0) {
      throw new Error("must assign nonzero width to at least one node");
    }
    for (const [i, compon] of components.entries()) {
      const offset = (maxWidth - widths[i]) / 2;
      for (const layer of compon) {
        for (const node of layer) {
          node.x! += offset;
        }
      }
    }

    return maxWidth;
  }

  function weight<NewWeight extends WeightAccessor>(
    val: NewWeight
  ): SimplexOperator<{
    weight: NewWeight;
  }>;
  function weight(): Ops["weight"];
  function weight<NewWeight extends WeightAccessor>(
    val?: NewWeight
  ):
    | SimplexOperator<{
        weight: NewWeight;
      }>
    | Ops["weight"] {
    if (val === undefined) {
      return opts.weight;
    } else {
      const { weight: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        weight: val
      });
    }
  }
  simplexCall.weight = weight;

  return simplexCall;
}

export type DefaultSimplexOperator = SimplexOperator<{
  weight: ConstAccessor<readonly [1, 2, 8]>;
}>;

/**
 * Create a default {@link SimplexOperator}, bundled as {@link coordSimplex}.
 */
export function simplex(...args: never[]): DefaultSimplexOperator {
  if (args.length) {
    throw new Error(
      `got arguments to simplex(${args}), but constructor takes no arguments.`
    );
  }

  return buildOperator({
    weight: createConstAccessor([1, 2, 8] as const)
  });
}
