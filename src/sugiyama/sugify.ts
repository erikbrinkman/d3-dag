/**
 * Utility types for sugiyama layout
 *
 * This module should only really matter for those looking to develop custom
 * {@link sugiyama/coord!Coord}s or {@link sugiyama/decross!Decross}s.
 *
 * @packageDocumentation
 */
import { graph, Graph, GraphLink, GraphNode, MutGraphNode } from "../graph";
import { bigrams, chain, map } from "../iters";
import { berr, ierr, Named } from "../utils";
import { NodeLength, Separation } from "./utils";

/** data for a sugi node that maps to a real node */
export interface SugiNodeDatum<NodeDatum = unknown, LinkDatum = unknown> {
  /** layer of the sugi node */
  layer: number;
  /** original node this sugi node wraps */
  node: GraphNode<NodeDatum, LinkDatum>;
}
/** data for a dummy sugi node that maps to part of a link */
export interface SugiLinkDatum<NodeDatum = unknown, LinkDatum = unknown> {
  /** layer of the sugi node */
  layer: number;
  /** original link this sugi node is on */
  link: GraphLink<NodeDatum, LinkDatum>;
}

/**
 * The NodeDatum used for layered {@link sugiyama!Sugiyama} layouts
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
 * A {@link graph!GraphNode} with {@link SugiDatum | SugiData}
 *
 * This is mostly a convenience type.
 */
export type SugiNode<NodeDatum = unknown, LinkDatum = unknown> = GraphNode<
  SugiDatum<NodeDatum, LinkDatum>,
  undefined
>;

/**
 * A {@link graph!MutGraphNode} with {@link SugiDatum | SugiData}
 *
 * This is mostly a convenience type.
 */
export type MutSugiNode<NodeDatum, LinkDatum> = MutGraphNode<
  SugiDatum<NodeDatum, LinkDatum>,
  undefined
>;

/**
 * Convert a layered graph in a sugi graph
 *
 * A sugi-graph is a non-multi dag that is layered, where each node is assigned
 * to a layer, and links only span a single layer.
 */
export function sugify<N, L>(
  input: Graph<N, L>,
  numLayers: number,
  layering: Named
): SugiNode<N, L>[][] {
  // create sugi graph
  const sugied = graph<SugiDatum<N, L>, undefined>();

  // map normal nodes to sugi nodes
  const nodeMap = new Map<GraphNode<N, L>, MutSugiNode<N, L>>();
  for (const node of input) {
    const layer = node.uy;
    if (layer !== undefined) {
      nodeMap.set(node, sugied.node({ node, layer }));
    } else {
      throw berr`layering ${layering} didn't assign a layer to a node`;
    }
  }

  // create dummy nodes for all child links
  for (const [node, sugiSource] of nodeMap) {
    const initLayer = sugiSource.data.layer;
    for (const link of node.childLinks()) {
      const sugiTarget = nodeMap.get(link.target)!;
      const targetLayer = sugiTarget.data.layer;
      if (targetLayer > initLayer) {
        let last = sugiSource;
        for (let layer = initLayer + 1; layer < targetLayer; ++layer) {
          const dummy = sugied.node({ link, layer });
          last.child(dummy, undefined);
          last = dummy;
        }
        last.child(sugiTarget);
      } else if (targetLayer < initLayer) {
        let last = sugiTarget;
        for (let layer = targetLayer + 1; layer < initLayer; ++layer) {
          const dummy = sugied.node({ link, layer });
          last.child(dummy, undefined);
          last = dummy;
        }
        last.child(sugiSource);
      } else {
        throw berr`layering ${layering} assigned nodes with an edge to the same layer`;
      }
    }
  }

  /* istanbul ignore else */
  if (sugied.multi()) {
    throw berr`layering ${layering} did not separate multi-graph children with an extra layer`;
  } else if (!sugied.acyclic()) {
    throw ierr`failed to produce acyclic sugiyama representation`;
  }

  // allocate the sugi nodes to layers
  const layers: SugiNode<N, L>[][] = Array<null>(numLayers)
    .fill(null)
    .map(() => []);
  for (const sugiNode of sugied) {
    const { layer } = sugiNode.data;
    if (layer < 0 || layer >= numLayers) {
      throw berr`layering ${layering} assigned node an invalid layer: ${layer}`;
    } else {
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
      if ("node" in sugi.data) {
        const { node } = sugi.data;
        node.x = sugi.x;
        node.y = sugi.y;

        // okay because sugi graphs are acyclic and non-multi
        for (let next of sugi.children()) {
          const points: [number, number][] = [[sugi.x, sugi.y]];
          let link;
          while ("link" in next.data) {
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
  dummy: number = 0
): SugiNodeLength<N, L> {
  return ({ data }: SugiNode<N, L>): number =>
    "node" in data ? len(data.node) : dummy;
}

/** validate accurate coordinate assignment */
export function validateCoord<N, L>(
  layers: SugiNode<N, L>[][],
  xSep: SugiSeparation<N, L>,
  width: number,
  coord: Named,
  tol: number = 0.001
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
        [[undefined, width]]
      )
    )) {
      if (nx - lx < xSep(last, next) - tol) {
        throw berr`coord ${coord} assigned nodes too close for separation`;
      }
    }
  }
}
