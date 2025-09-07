/**
 * Utility types for sugiyama layout
 *
 * This module should only really matter for those looking to develop custom
 * {@link Coord}s or {@link Decross}s.
 *
 * @packageDocumentation
 */
import {
  type Graph,
  type GraphLink,
  type GraphNode,
  graph,
  type MutGraph,
  type MutGraphNode,
} from "../graph";
import { bigrams, chain, map, some } from "../iters";
import type { NodeLength } from "../layout";
import { berr, type Named } from "../utils";
import type { Separation } from "./utils";

/** data for a sugi node that maps to a real node */
export interface SugiNodeDatum<
  out NodeDatum = unknown,
  out LinkDatum = unknown,
> {
  /** tag indicating that this sugi node is backed by a graph node */
  role: "node";
  /** top layer of the sugi node */
  topLayer: number;
  /** bottom layer of the sugi node */
  bottomLayer: number;
  /** original node this sugi node wraps */
  node: GraphNode<NodeDatum, LinkDatum>;
}

/** data for a dummy sugi node that maps to part of a link */
export interface SugiLinkDatum<
  out NodeDatum = unknown,
  out LinkDatum = unknown,
> {
  /** tag indicating that this sugi node is backed by a link */
  role: "link";
  /** layer of the sugi node */
  layer: number;
  /** original link this sugi node is on */
  link: GraphLink<NodeDatum, LinkDatum>;
}

/**
 * the NodeDatum used for layered {@link sugiyama} layouts
 *
 * Nodes in the original graph have a layer and a reference to the original
 * node. "dummy nodes" have a link to the parent and child of the edge their on
 * in the original dag, as well as their actual layer. Given that duplicate
 * edges aren't allowed, this uniquely defines each dummy node.
 */
export type SugiDatum<NodeDatum = unknown, LinkDatum = unknown> =
  | SugiNodeDatum<NodeDatum, LinkDatum>
  | SugiLinkDatum<NodeDatum, LinkDatum>;

/**
 * a {@link GraphNode} with {@link SugiDatum | SugiData}
 */
export type SugiNode<NodeDatum = unknown, LinkDatum = unknown> = GraphNode<
  SugiDatum<NodeDatum, LinkDatum>,
  undefined
>;

/**
 * a {@link MutGraphNode} with {@link SugiDatum | SugiData}
 */
export type MutSugiNode<NodeDatum, LinkDatum> = MutGraphNode<
  SugiDatum<NodeDatum, LinkDatum>,
  undefined
>;

function addSugiLinks<N, L>(
  sugied: MutGraph<SugiDatum<N, L>, undefined>,
  nodeMap: Map<GraphNode<N, L>, MapVal<N, L>>,
  numLayers: number,
  layering: Named,
): SugiNode<N, L>[][] {
  // create dummy nodes for all child links
  for (const [node, [sourceData, sugiSource]] of nodeMap) {
    // NOTE this casts are regrettably necessary since we need the nodes to
    // both have the mut nodes and the SugiNodeDatum. We could make a tuple
    // guaranteeing, but that might be overkill
    const initLayer = sourceData.bottomLayer;
    for (const link of node.childLinks()) {
      const [targetData, sugiTarget] = nodeMap.get(link.target)!;
      const targetLayer = targetData.topLayer;
      if (targetLayer > initLayer) {
        let last = sugiSource;
        for (let layer = initLayer + 1; layer < targetLayer; ++layer) {
          const dummy = sugied.node({ link, layer, role: "link" });
          last.child(dummy, undefined);
          last = dummy;
        }
        last.child(sugiTarget);
      } else if (targetLayer < initLayer) {
        let last = sugiTarget;
        for (let layer = targetLayer + 1; layer < initLayer; ++layer) {
          const dummy = sugied.node({ link, layer, role: "link" });
          last.child(dummy, undefined);
          last = dummy;
        }
        last.child(sugiSource);
      } else {
        throw berr`layering ${layering} assigned nodes with an edge to the same layer`;
      }
    }
  }

  // allocate the sugi nodes to layers
  const layers: SugiNode<N, L>[][] = Array<null>(numLayers)
    .fill(null)
    .map(() => []);
  for (const sugiNode of sugied.nodes()) {
    const { data } = sugiNode;
    if (data.role === "node") {
      const { topLayer, bottomLayer } = data;
      for (let layer = topLayer; layer <= bottomLayer; ++layer) {
        layers[layer].push(sugiNode);
      }
    } else {
      const { layer } = data;
      layers[layer].push(sugiNode);
    }
  }

  for (const layer of layers) {
    if (!layer.length) {
      throw berr`layering ${layering} didn't assign a node to every layer`;
    }
  }

  return layers;
}

// This type makes it so we have access to the mutable nodes but node data
type MapVal<N, L> = readonly [SugiNodeDatum<N, L>, MutSugiNode<N, L>];

/**
 * convert a layered graph in a sugi graph
 *
 * A sugi-graph is a non-multi dag that is layered, where each node is assigned
 * to a layer, and links only span a single layer.
 */
export function sugifyLayer<N, L>(
  input: Graph<N, L>,
  nodeHeight: NodeLength<N, L>,
  gap: number,
  numLayers: number,
  layering: Named,
): readonly [SugiNode<N, L>[][], number] {
  // create sugi graph
  const sugied = graph<SugiDatum<N, L>, undefined>();

  // map normal nodes to sugi nodes
  const layerBoosts = Array<boolean>(numLayers).fill(false);
  const nodeMap = new Map<GraphNode<N, L>, MapVal<N, L>>();
  for (const node of input.nodes()) {
    const layer = node.uy;
    if (layer === undefined) {
      throw berr`layering ${layering} didn't assign a layer to a node`;
    } else if (layer < 0 || layer >= numLayers) {
      throw berr`layering ${layering} assigned node an invalid layer: ${layer}`;
    } else {
      const ancestors = chain(node.parentCounts(), node.childCounts());
      if (
        !layerBoosts[layer] &&
        some(ancestors, ([{ uy }, cnt]) => cnt > 1 && uy === layer - 1)
      ) {
        layerBoosts[layer] = true;
      }
      const data: SugiNodeDatum<N, L> = {
        node,
        topLayer: layer,
        bottomLayer: layer,
        role: "node",
      };
      nodeMap.set(node, [data, sugied.node(data)]);
    }
  }

  // boost layers for adjacent multi-links
  let sum = 0;
  const cumBoosts = layerBoosts.map((boost) => (sum += +boost));
  for (const [data] of nodeMap.values()) {
    const boost = cumBoosts[data.topLayer];
    data.topLayer += boost;
    data.bottomLayer += boost;
  }

  // create dummy nodes for all child links
  const layers = addSugiLinks(sugied, nodeMap, numLayers + sum, layering);

  // assign ys
  let height = -gap;
  for (const layer of layers) {
    height += gap;
    const layerHeight = Math.max(
      -gap, // in case all dummy nodes
      ...map(layer, ({ data }) =>
        data.role === "node" ? nodeHeight(data.node) : -Infinity,
      ),
    );
    const y = height + layerHeight / 2;
    for (const sugi of layer) {
      sugi.y = y;
    }
    height += layerHeight;
  }
  return [layers, height];
}

/**
 * Convert a layered graph in a sugi graph
 *
 * A sugi-graph is a non-multi dag that is layered, where each node is assigned
 * to a layer, and links only span a single layer.
 */
export function sugifyCompact<N, L>(
  input: Graph<N, L>,
  nodeHeight: NodeLength<N, L>,
  height: number,
  layering: Named,
): SugiNode<N, L>[][] {
  // create sugi graph
  const sugied = graph<SugiDatum<N, L>, undefined>();

  // map original nodes
  const cuts = [0, height];
  const nodeMap = new Map<GraphNode<N, L>, MapVal<N, L>>();
  for (const node of input.nodes()) {
    const y = node.uy;
    if (y === undefined) {
      throw berr`layering ${layering} didn't assign a y coordinate to every node`;
    } else {
      const halfHeight = nodeHeight(node) / 2;
      const topLayer = y - halfHeight;
      const bottomLayer = y + halfHeight;
      const datum: SugiNodeDatum<N, L> = {
        node,
        topLayer,
        bottomLayer,
        role: "node",
      };
      nodeMap.set(node, [datum, sugied.node(datum)]);
      cuts.push(topLayer, bottomLayer);
    }
  }

  // find unique cuts
  cuts.sort((a, b) => a - b);
  const tol = (height / nodeMap.size) * 1e-3;
  const layerCuts: number[] = [];
  const cutLayers = new Map<number, number>();
  let last = 0;
  let layer = 0;
  for (const cut of cuts) {
    if (cut > last + tol) {
      layerCuts.push(last);
      last = cut;
      layer++;
    }
    cutLayers.set(cut, layer);
  }
  layerCuts.push(last);

  // add cut for multi-edges that are still on adjacent layers
  const boosts = Array<boolean>(layerCuts.length).fill(false);
  for (const [node, [{ topLayer }]] of nodeMap) {
    const layer = cutLayers.get(topLayer)!;
    const target = layer - 1;
    for (const [child, count] of chain(
      node.childCounts(),
      node.parentCounts(),
    )) {
      if (count > 1) {
        const [{ bottomLayer }] = nodeMap.get(child)!;
        if (cutLayers.get(bottomLayer) === target) {
          if (!boosts[layer]) {
            boosts[layer] = true;
            layerCuts.push((topLayer + bottomLayer) / 2);
          }
          break;
        }
      }
    }
  }

  // resort for new cuts
  // NOTE this could be a merge sort between the first and second halves
  layerCuts.sort((a, b) => a - b);
  let sum = 0;
  const layerBoosts = boosts.map((boost) => (sum += +boost));
  for (const [y, layer] of cutLayers) {
    cutLayers.set(y, layer + layerBoosts[layer]);
  }

  // remap to layers
  for (const [data] of nodeMap.values()) {
    data.topLayer = cutLayers.get(data.topLayer)!;
    data.bottomLayer = cutLayers.get(data.bottomLayer)!;
  }

  // create dummy nodes for all child links
  const layers = addSugiLinks(sugied, nodeMap, layerCuts.length, layering);

  // assign ys
  for (const layer of layers) {
    for (const sugi of layer) {
      if (sugi.data.role === "node") {
        sugi.y = sugi.data.node.y;
      } else {
        sugi.y = layerCuts[sugi.data.layer];
      }
    }
  }

  return layers;
}

/**
 * Unsugify a sugi graph
 *
 * Given a sugi graph where each sugi node has an assigned x and y coordinate,
 * convert those back into coordinates on the underlying nodes, or point arrays
 * on the edges.
 */
export function unsugify<N, L>(layers: SugiNode<N, L>[][]) {
  // find all true nodes
  for (const layer of layers) {
    for (const sugi of layer) {
      if (sugi.data.role === "node") {
        const { node } = sugi.data;
        node.x = sugi.x;
        node.y = sugi.y;

        // okay because sugi graphs are acyclic and non-multi
        for (let next of sugi.children()) {
          const points: [number, number][] = [[sugi.x, sugi.y]];
          let link: GraphLink<N, L> | undefined;
          while (next.data.role === "link") {
            link = next.data.link;
            points.push([next.x, next.y]);
            [next] = next.children(); // guaranteed to have one child
          }
          points.push([next.x, next.y]);
          const tgt = next.data.node;

          // this happens if the link was short, in that case, we can't have
          // a cycle, so tgt will be unique in all of child and parents
          const links = chain(node.childLinksTo(tgt), node.parentLinksTo(tgt));
          if (!link) [link] = links;
          // NOTE check for direction of original edge, and reverse if necessary
          if (link.source !== node) points.reverse();
          link.points.splice(0, link.points.length, ...points);
        }
      }
    }
  }
}

/** An accessor for computing the length of a sugi node */
export type SugiNodeLength<NodeDatum = never, LinkDatum = never> = NodeLength<
  SugiDatum<NodeDatum, LinkDatum>,
  undefined
>;

/**
 * A function that defines the horizontal separation between nodes
 *
 * The separation function takes a left and right node, and returns how far
 * apart their centers should be.
 */
export type SugiSeparation<NodeDatum = never, LinkDatum = never> = Separation<
  SugiDatum<NodeDatum, LinkDatum>,
  undefined
>;

/**
 * Convert a node length into a sugi node length
 *
 * @param len - the original node length
 * @param dummy - the length of dummy nodes
 */
export function sugiNodeLength<N, L>(
  len: NodeLength<N, L>,
  dummy: number = 0,
): SugiNodeLength<N, L> {
  return ({ data }: SugiNode<N, L>): number =>
    data.role === "node" ? len(data.node) : dummy;
}

/** validate accurate coordinate assignment */
export function validateCoord<N, L>(
  layers: SugiNode<N, L>[][],
  xSep: SugiSeparation<N, L>,
  width: number,
  coord: Named,
  tol: number = 0.001,
) {
  for (const layer of layers) {
    for (const node of layer) {
      if (node.ux === undefined) {
        throw berr`coord ${coord} didn't assign an x to every node`;
      }
    }

    for (const [[last, lx], [next, nx]] of bigrams(
      chain<[undefined | SugiNode<N, L>, number]>(
        [[undefined, 0]],
        map(layer, (n) => [n, n.x]),
        [[undefined, width]],
      ),
    )) {
      if (nx - lx < xSep(last, next) - tol) {
        throw berr`coord ${coord} assigned nodes too close for separation`;
      }
    }
  }
}
