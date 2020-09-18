import { DagNode, LayoutDagRoot } from "../../dag/node";
/**
 * This accessor positions nodes to minimize aspect of curvature and distance
 * between nodes. The coordinates are assigned by solving a quadratic program,
 * with weights for various parts of the objective function. Quadratic programs
 * can take a while to solve, but this will likely produce the most appealing
 * output.
 *
 * @packageDocumentation
 */
import { HorizableNode, Operator, Separation } from ".";
import { SafeMap, setIntersect } from "../../utils";
import {
  coordSingleLayer,
  indices,
  init,
  layout,
  minBend,
  minDist,
  solve
} from "./utils";

import { DummyNode } from "../dummy";

/**
 * Compute a map from node ids to a connected component index. This is useful
 * to quickly compare if two nodes are in the same connected component.
 * @internal
 */
function componentMap<NodeType extends DagNode>(
  layers: (NodeType | DummyNode)[][]
): SafeMap<string, number> {
  // Note computing connected components is generally difficult, and with the
  // layer representation, we lost access to convenient dag methods. Thus, we
  // first reconstruct a mock dag to get connected components, then add them.
  const roots = new SafeMap<string, NodeType | DummyNode>();
  // We iterate in reverse order because we pop children, thus we're guaranteed
  // to only have roots after we're done.
  for (const layer of layers.slice().reverse()) {
    for (const node of layer) {
      for (const child of node.ichildren()) {
        roots.delete(child.id);
      }
      roots.set(node.id, node);
    }
  }

  // create a fake dag, and use it to get components
  const components = new LayoutDagRoot([...roots.values()]).split();
  // assign each node it's component id for fast checking if they're identical
  const compMap = new SafeMap<string, number>();
  for (const [i, comp] of components.entries()) {
    for (const node of comp) {
      compMap.set(node.id, i);
    }
  }
  return compMap;
}

/**
 * If disconnected components exist in the same layer, then we can minimize the
 * distance between them to make a reasonable objective. If, however, layers
 * share no common components then they are truely independent in assignment of
 * x coordinates and should be solved separately.
 * @internal
 */
function splitComponentLayers<NodeType extends DagNode>(
  layers: (NodeType | DummyNode)[][],
  compMap: SafeMap<string, number>
): (NodeType | DummyNode)[][][] {
  // Because of dummy nodes, there's no way for a component to skip a layer,
  // thus for layers to share no common components, there must be a clear
  // boundary between any two.
  const split = [];
  let newLayers = [];
  let lastComponents = new Set<number>();
  for (const layer of layers) {
    const currentComponents = new Set(layer.map((n) => compMap.getThrow(n.id)));
    if (!setIntersect(lastComponents, currentComponents)) {
      split.push((newLayers = []));
    }
    newLayers.push(layer);
    lastComponents = currentComponents;
  }
  return split;
}

/**
 * The operator for quadratically optimized coordinates. Two of the weight
 * settings allow specifying a different weight for regular nodes, and dummy
 * nodes (longer edges). The total weight for that node type must be greater
 * than zero otherwise the optimization will not be well formed.
 */
export interface QuadOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /**
   * Set the weight for verticality. Higher weights mean connected nodes should
   * be closer together, or corollarily edges should be closer to vertical
   * lines. There are two different weights, [ *regular nodes*, *dummy nodes*
   * ], the weight for a pair of connected nodes the sum of the weight value
   * for each node depending on whether not that node is a dummy node. Setting
   * them both to positive means all lines should ve roughly vertical, while
   * setting a weight to zero doesn't peanalize edges between those types of
   * nodes.
   */
  vertical(val: [number, number]): QuadOperator<NodeType>;
  /**
   * Get the current vertical weights which defaults to [1, 0]. By setting the
   * weight of dummy nodes to zero, longer edges aren't penalized to be
   * straighter than short edges.
   */
  vertical(): [number, number];

  /**
   * Set the weight for curviness. Higher weights mean an edge going through a node type should be roughly straight.
   * There are two different weights, [ *regular nodes*, *dummy nodes*
   * ], that impact the curvature through those node types. Setting regular
   * nodes to positive will create a type of flow of edges going through a
   * node, while setting dummy nodes will enforce the longer edges should try
   * to be stright.
   */
  curve(val: [number, number]): QuadOperator<NodeType>;
  /**
   * Get the current vertical weights which defaults to [0, 1]. By setting the
   * weight of non-dummy nodes to zero, we only care about the curvature of
   * edges, not lines that pass through nodes.
   */
  curve(): [number, number];

  /**
   * Set the weight that for how close different disconnected components should
   * be. The higher the weight, the more different components will be close to
   * each other at the expense of other objectives. This needs to be greater
   * than zero to make the objective sound when there are disconnected
   * components, but otherwise should probably be very small.
   */
  component(val: number): QuadOperator<NodeType>;
  /** Get the current component weight, which defaults to one. */
  component(): number;
}

/** @internal */
function buildOperator<NodeType extends DagNode>(
  vertNode: number,
  vertDummy: number,
  curveNode: number,
  curveDummy: number,
  comp: number
): QuadOperator<NodeType> {
  function quadComponent(
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    separation: Separation<NodeType>,
    compMap: SafeMap<string, number>
  ): void {
    const inds = indices(layers);
    const [Q, c, A, b] = init(layers, inds, separation);

    for (const layer of layers) {
      for (const par of layer) {
        const pind = inds.getThrow(par.id);
        const wpdist = par instanceof DummyNode ? vertDummy : vertNode;
        for (const node of par.ichildren()) {
          const nind = inds.getThrow(node.id);
          const wndist = node instanceof DummyNode ? vertDummy : vertNode;
          const wcurve = node instanceof DummyNode ? curveDummy : curveNode;
          minDist(Q, pind, nind, wpdist + wndist);
          for (const child of node.ichildren()) {
            const cind = inds.getThrow(child.id);
            minBend(Q, pind, nind, cind, wcurve);
          }
        }
      }
    }

    // for disconnected dags, add loss for being too far apart
    for (let [first, ...rest] of layers) {
      for (const second of rest) {
        if (compMap.getThrow(first.id) !== compMap.getThrow(second.id)) {
          minDist(Q, inds.getThrow(first.id), inds.getThrow(second.id), comp);
        }

        first = second;
      }
    }

    const solution = solve(Q, c, A, b);
    layout(layers, inds, solution);
  }

  function quadCall(
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    separation: Separation<NodeType>
  ): void {
    if (vertNode === 0 && curveNode === 0) {
      throw new Error(
        "node vertical weight or node curve weight needs to be positive"
      );
    } else if (vertDummy === 0 && curveDummy === 0) {
      throw new Error(
        "dummy vertical weight or dummy curve weight needs to be positive"
      );
    }
    const compMap = componentMap(layers);
    for (const comp of splitComponentLayers(layers, compMap)) {
      if (comp.every((l) => l.length === 1)) {
        for (const [node] of comp) {
          node.x = 0.5;
        }
      } else if (comp.length === 1) {
        const [layer] = comp;
        coordSingleLayer(layer, separation);
      } else {
        quadComponent(comp, separation, compMap);
      }
    }
  }

  function vertical(): [number, number];
  function vertical(val: [number, number]): QuadOperator<NodeType>;
  function vertical(
    val?: [number, number]
  ): [number, number] | QuadOperator<NodeType> {
    if (val === undefined) {
      return [vertNode, vertDummy];
    }
    const [valNode, valDummy] = val;
    if (valNode < 0 || valDummy < 0) {
      throw new Error(
        `weights must be non-negative, but were ${valNode} and ${valDummy}`
      );
    } else {
      return buildOperator(valNode, valDummy, curveNode, curveDummy, comp);
    }
  }
  quadCall.vertical = vertical;

  function curve(): [number, number];
  function curve(val: [number, number]): QuadOperator<NodeType>;
  function curve(
    val?: [number, number]
  ): [number, number] | QuadOperator<NodeType> {
    if (val === undefined) {
      return [curveNode, curveDummy];
    }
    const [valNode, valDummy] = val;
    if (valNode < 0 || valDummy < 0) {
      throw new Error(
        `weights must be non-negative, but were ${valNode} and ${valDummy}`
      );
    } else {
      return buildOperator(vertNode, vertDummy, valNode, valDummy, comp);
    }
  }
  quadCall.curve = curve;

  function component(): number;
  function component(val: number): QuadOperator<NodeType>;
  function component(val?: number): number | QuadOperator<NodeType> {
    if (val === undefined) {
      return comp;
    } else if (val <= 0) {
      throw new Error(`weight must be positive, but was ${val}`);
    } else {
      return buildOperator(vertNode, vertDummy, curveNode, curveDummy, val);
    }
  }
  quadCall.component = component;

  return quadCall;
}

/** Create a default [[QuadOperator]]. */
export function quad<NodeType extends DagNode>(
  ...args: never[]
): QuadOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to quad(${args}), but constructor takes no aruguments.`
    );
  }

  return buildOperator(1, 0, 0, 1, 1);
}
