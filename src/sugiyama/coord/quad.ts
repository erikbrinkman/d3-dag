/**
 * The {@link QuadOperator} positions nodes to minimize a quadratic
 * optimization.
 *
 * @module
 */
import { CoordNodeSizeAccessor, CoordOperator } from ".";
import { bigrams, def, dfs, setIntersect } from "../../utils";
import { SugiNode } from "../utils";
import { indices, init, layout, minBend, minDist, solve } from "./utils";

/**
 * Compute a map from node ids to a connected component index. This is useful
 * to quickly compare if two nodes are in the same connected component.
 *
 * @internal
 */
function componentMap(layers: SugiNode[][]): Map<SugiNode, number> {
  // create parent map to allow accessing parents
  const parents = new Map<SugiNode, SugiNode[]>();
  for (const layer of layers) {
    for (const node of layer) {
      for (const child of node.ichildren()) {
        const pars = parents.get(child);
        if (pars) {
          pars.push(node);
        } else {
          parents.set(child, [node]);
        }
      }
    }
  }

  // "children" function that returns children and parents
  function* graph(node: SugiNode): Generator<SugiNode, void, undefined> {
    yield* node.ichildren();
    yield* parents.get(node) || [];
  }

  // dfs over all nodes
  let component = 0;
  const compMap = new Map<SugiNode, number>();
  for (const layer of layers) {
    for (const node of layer) {
      if (compMap.has(node)) continue;
      for (const comp of dfs(graph, node)) {
        compMap.set(comp, component);
      }
      component++;
    }
  }

  return compMap;
}

/**
 * If disconnected components exist in the same layer, then we can minimize the
 * distance between them to make a reasonable objective. If, however, layers
 * share no common components then they are truely independent in assignment of
 * x coordinates and should be solved separately.
 *
 * @internal
 */
function splitComponentLayers<N, L>(
  layers: SugiNode<N, L>[][],
  compMap: Map<SugiNode, number>
): SugiNode<N, L>[][][] {
  // Because of dummy nodes, there's no way for a component to skip a layer,
  // thus for layers to share no common components, there must be a clear
  // boundary between any two.
  const split = [];
  let newLayers = [];
  let lastComponents = new Set<number>();
  for (const layer of layers) {
    const currentComponents = new Set(layer.map((n) => def(compMap.get(n))));
    if (!setIntersect(lastComponents, currentComponents)) {
      split.push((newLayers = []));
    }
    newLayers.push(layer);
    lastComponents = currentComponents;
  }
  return split;
}

/**
 * A {@link CoordOperator} that places nodes to minimize a quadratic function
 *
 * The minimization involves minimizing the distance between {@link vertical |
 * connected nodes}, the {@link curve | curvature of edges}, and the distance
 * between {@link component | disconnected components}.
 *
 * This operators generally takes the longest of all built-in operators but
 * produces the most pleasing layout.
 *
 * Create with {@link quad}.
 *
 * <img alt="quad example" src="media://sugi-simplex-opt-quad.png" width="400">
 */
export interface QuadOperator extends CoordOperator<unknown, unknown> {
  /**
   * Set the weight for verticality. Higher weights mean connected nodes should
   * be closer together, or corollarily edges should be closer to vertical
   * lines. There are two different weights, [ *regular nodes*, *dummy nodes*
   * ], the weight for a pair of connected nodes the sum of the weight value
   * for each node depending on whether not that node is a dummy node. Setting
   * them both to positive means all lines should be roughly vertical, while
   * setting a weight to zero doesn't peanalize edges between those types of
   * nodes. (default: [1, 0])
   */
  vertical(val: readonly [number, number]): QuadOperator;
  /**
   * Get the current vertical weights. By setting the weight of dummy nodes to
   * zero, longer edges aren't penalized to be straighter than short edges.
   */
  vertical(): [number, number];

  /**
   * Set the weight for curviness. Higher weights mean an edge going through a
   * node type should be roughly straight.  There are two different weights, [
   * *regular nodes*, *dummy nodes* ], that impact the curvature through those
   * node types. Setting regular nodes to positive will create a type of flow
   * of edges going through a node, while setting dummy nodes will enforce the
   * longer edges should try to be stright. (default: [0, 1])
   */
  curve(val: readonly [number, number]): QuadOperator;
  /**
   * Get the current vertical weights. By setting the weight of non-dummy nodes
   * to zero, we only care about the curvature of edges, not lines that pass
   * through nodes.
   */
  curve(): [number, number];

  /**
   * Set the weight for how close different disconnected components should be.
   * The higher the weight, the more different components will be close to each
   * other at the expense of other objectives. This needs to be greater than
   * zero to make the objective sound when there are disconnected components,
   * but otherwise should probably be very small. (default: 1)
   */
  component(val: number): QuadOperator;
  /** Get the current component weight. */
  component(): number;
}

function buildOperator(options: {
  vertNode: number;
  vertDummy: number;
  curveNode: number;
  curveDummy: number;
  comp: number;
}): QuadOperator {
  function quadComponent<N, L>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>,
    compMap: Map<SugiNode, number>
  ): number {
    const { vertNode, vertDummy, curveNode, curveDummy, comp } = options;
    const inds = indices(layers);
    const [Q, c, A, b] = init(layers, inds, nodeSize);

    for (const layer of layers) {
      for (const par of layer) {
        const pind = def(inds.get(par));
        const wpdist = "node" in par.data ? vertNode : vertDummy;
        for (const node of par.ichildren()) {
          const nind = def(inds.get(node));
          const wndist = "node" in node.data ? vertNode : vertDummy;
          const wcurve = "node" in node.data ? curveNode : curveDummy;
          minDist(Q, pind, nind, wpdist + wndist);
          for (const child of node.ichildren()) {
            const cind = def(inds.get(child));
            minBend(Q, pind, nind, cind, wcurve);
          }
        }
      }
    }

    // for disconnected dags, add loss for being too far apart
    for (const layer of layers) {
      for (const [first, second] of bigrams(layer)) {
        if (def(compMap.get(first)) !== def(compMap.get(second))) {
          minDist(Q, def(inds.get(first)), def(inds.get(second)), comp);
        }
      }
    }

    const solution = solve(Q, c, A, b);
    return layout(layers, nodeSize, inds, solution);
  }

  function quadCall<N, L>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>
  ): number {
    const { vertNode, vertDummy, curveNode, curveDummy } = options;
    if (vertNode === 0 && curveNode === 0) {
      throw new Error(
        "node vertical weight or node curve weight needs to be positive"
      );
    } else if (vertDummy === 0 && curveDummy === 0) {
      throw new Error(
        "dummy vertical weight or dummy curve weight needs to be positive"
      );
    }

    // split components
    const compMap = componentMap(layers);
    const components = splitComponentLayers(layers, compMap);

    // layout each component and get width
    const widths = components.map((compon) =>
      quadComponent(compon, nodeSize, compMap)
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
          node.x = def(node.x) + offset;
        }
      }
    }

    return maxWidth;
  }

  function vertical(): [number, number];
  function vertical(val: readonly [number, number]): QuadOperator;
  function vertical(
    val?: readonly [number, number]
  ): [number, number] | QuadOperator {
    if (val === undefined) {
      const { vertNode, vertDummy } = options;
      return [vertNode, vertDummy];
    }
    const [vertNode, vertDummy] = val;
    if (vertNode < 0 || vertDummy < 0) {
      throw new Error(
        `weights must be non-negative, but were ${vertNode} and ${vertDummy}`
      );
    } else {
      return buildOperator({ ...options, vertNode, vertDummy });
    }
  }
  quadCall.vertical = vertical;

  function curve(): [number, number];
  function curve(val: readonly [number, number]): QuadOperator;
  function curve(
    val?: readonly [number, number]
  ): [number, number] | QuadOperator {
    if (val === undefined) {
      const { curveNode, curveDummy } = options;
      return [curveNode, curveDummy];
    }
    const [curveNode, curveDummy] = val;
    if (curveNode < 0 || curveDummy < 0) {
      throw new Error(
        `weights must be non-negative, but were ${curveNode} and ${curveDummy}`
      );
    } else {
      return buildOperator({ ...options, curveNode, curveDummy });
    }
  }
  quadCall.curve = curve;

  function component(): number;
  function component(val: number): QuadOperator;
  function component(val?: number): number | QuadOperator {
    if (val === undefined) {
      return options.comp;
    } else if (val <= 0) {
      throw new Error(`weight must be positive, but was ${val}`);
    } else {
      return buildOperator({ ...options, comp: val });
    }
  }
  quadCall.component = component;

  return quadCall;
}

/**
 * Create a default {@link QuadOperator}, bundled as {@link coordQuad}.
 */
export function quad(...args: never[]): QuadOperator {
  if (args.length) {
    throw new Error(
      `got arguments to quad(${args}), but constructor takes no aruguments.`
    );
  }

  return buildOperator({
    vertNode: 1,
    vertDummy: 0,
    curveNode: 0,
    curveDummy: 1,
    comp: 1
  });
}
