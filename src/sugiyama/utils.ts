/**
 * Utility types for sugiyama layout
 *
 * This module should only really matter for those looking to develop custom
 * {@link CoordOperator}s, {@link DecrossOperator}s, or in the rare case
 * advanced {@link SugiNodeSizeAccessor}s.
 *
 * @packageDocumentation
 */
import { Dag, DagLink, DagNode } from "../dag";
import { hierarchy } from "../dag/create";
import { map } from "../iters";
import { assert, bigrams, js } from "../utils";

/**
 * The NodeDatum used for layered {@link SugiyamaOperator} layouts
 *
 * Nodes in the original graph have a layer and a reference to the original
 * node. "dummy nodes" have a link to the parent and child of the edge their on
 * in the original dag, as well as their actual layer. Given that duplicate
 * edges aren't allowed, this uniquely defines each dummy node.
 */
export type SugiData<NodeDatum = unknown, LinkDatum = unknown> =
  | {
      /** layer of the sugi node */
      layer: number;
      /** original node this sugi node wraps */
      node: DagNode<NodeDatum, LinkDatum>;
    }
  | {
      /** layer of the sugi node */
      layer: number;
      /** original link this sugi node is on */
      link: DagLink<NodeDatum, LinkDatum>;
    };

/**
 * A {@link DagNode} with {@link SugiData}
 *
 * This is mostly a convenience type.
 */
export type SugiNode<NodeDatum = unknown, LinkDatum = unknown> = DagNode<
  SugiData<NodeDatum, LinkDatum>,
  undefined
>;

/** validate layer assignments @internal */
function vlayer(node: DagNode): number {
  if (node.value === undefined) {
    throw new Error(
      js`node with data '${node.data}' did not get a defined value during layering`
    );
  } else if (node.value < 0) {
    throw new Error(
      js`node with data '${node.data}' got an invalid (negative) value during layering: ${node.value}`
    );
  } else {
    return node.value;
  }
}

/**
 * Create a dag of layered {@link SugiNode}s from a layered dag.
 *
 * Internally the {@link sugiyama} layout converts a dag into {@link SugiNode}s
 * to store metadata about the layout before copying the data back to the
 * original dag. {@link SugiNode}s are normal dag nodes who's data have a
 * special relation to the underlying dag's structure. Each new node contain
 * the wrapped nodes for real nodes, or links to the source and target nodes
 * for dummy nodes.
 *
 * This method returns the nodes in their appropriate layers. After updating
 * metadata on the layered nodes, call {@link unsugify} to copy the data to the
 * underling dag.
 *
 * The only reason to use this is if calling parts of the sugiyama chain
 * independently.
 */
export function sugify<N, L>(dag: Dag<N, L>): SugiNode<N, L>[][] {
  // NOTE we need to cache so that the returned 'SugiData' are the same object
  const cache = new Map(
    map(dag, (node) => [node, { node, layer: vlayer(node) }] as const)
  );

  // verify links
  for (const { source, target } of dag.ilinks()) {
    const multi = source.nchildLinksTo(target) > 1;
    if (multi && source.value! + 1 >= target.value!) {
      throw new Error(
        js`layering left child data '${target.data}' (${target.value}) whose layer was not two more than its parent data '${source.data}' (${source.value})`
      );
    } else if (!multi && source.value! >= target.value!) {
      throw new Error(
        js`layering left child data '${target.data}' (${target.value}) whose layer was not greater than its parent data '${source.data}' (${source.value})`
      );
    }
  }

  // children function
  function augment(data: SugiData<N, L>): SugiData<N, L>[] {
    const layer = data.layer + 1;
    const links = "node" in data ? data.node.childLinks() : [data.link];
    return links.map((link) => {
      const datum = cache.get(link.target)!;
      return datum.layer === layer ? datum : { link, layer };
    });
  }

  // create sugi dag
  const create = hierarchy().children(augment);
  const sugi = create(...map(dag.iroots(), (node) => cache.get(node)!));
  assert(!sugi.multidag());

  // assign nodes to layer
  const layers: SugiNode<N, L>[][] = [];
  for (const node of sugi) {
    const layer = layers[node.data.layer] || (layers[node.data.layer] = []);
    layer.push(node);
  }
  if (!layers[0] || !layers[0].length) {
    throw new Error("no nodes were assigned to layer 0");
  }
  for (const layer of layers) {
    assert(layer && layer.length);
  }
  return layers;
}

/**
 * Copy layout from a layered sugiyama dag back to it's underling dag.
 *
 * For normal nodes this just sets their x and y equal to the {@link
 * SugiNode}'s x and y. Chains of dummy nodes have their x and y's copied over
 * the link's points attribute.
 *
 * The only reason to call this is if laying out parts of the {@link sugiyama}
 * method independently.
 */
export function unsugify(layers: readonly (readonly SugiNode[])[]): void {
  for (const layer of layers) {
    for (const sugi of layer) {
      if ("link" in sugi.data) continue;
      sugi.data.node.x = sugi.x!;
      sugi.data.node.y = sugi.y!;

      const pointsMap = new Map(
        map(
          sugi.data.node.ichildLinks(),
          ({ points, target }) => [target, points] as const
        )
      );
      for (let child of sugi.ichildren()) {
        const points = [{ x: sugi.x!, y: sugi.y! }];
        while ("link" in child.data) {
          points.push({ x: child.x!, y: child.y! });
          [child] = child.ichildren();
        }
        points.push({ x: child.x!, y: child.y! });

        // update
        const assign = pointsMap.get(child.data.node)!;
        assign.splice(0, assign.length, ...points);
      }
    }
  }
}

/**
 * Verify that x coordinates of a layering are consistent
 *
 * Note, we don't verify that node widths were respected.
 */
export function verifyCoordAssignment(
  layers: readonly (readonly SugiNode[])[],
  width: number
): void {
  for (const layer of layers) {
    let last = 0;
    for (const node of layer) {
      if (node.x === undefined) {
        throw new Error(js`coord didn't assign an x to node '${node}'`);
      } else if (node.x < last) {
        throw new Error(
          js`coord assigned an x (${node.x}) smaller than a previous node in the layer '${node}'`
        );
      }
      last = node.x;
    }
    if (last > width) {
      throw new Error(
        `coord assigned an x (${last}) greater than width (${width})`
      );
    }
  }
}

/**
 * Scale the x and y of a layered dag
 *
 * Note that this only scales the x and y of nodes, not of link points, so this
 * is often called on layered {@link SugiNode}s before calling {@link unsugify}.
 */
export function scaleLayers(
  layers: readonly (readonly DagNode[])[],
  xscale: number,
  yscale: number
): void {
  for (const layer of layers) {
    for (const node of layer) {
      node.x! *= xscale;
      node.y! *= yscale;
    }
  }
}

/** compute the number of crossings in a layered sugi node */
export function crossings(layers: readonly (readonly SugiNode[])[]): number {
  let crossings = 0;
  for (const [topLayer, bottomLayer] of bigrams(layers)) {
    const inds = new Map(bottomLayer.map((node, j) => [node, j] as const));
    for (const [j, p1] of topLayer.entries()) {
      for (const p2 of topLayer.slice(j + 1)) {
        // NOTE sugi nodes can't be multi-graphs, so ichildren is fine
        for (const c1 of p1.ichildren()) {
          for (const c2 of p2.ichildren()) {
            if (c1 !== c2 && inds.get(c1)! > inds.get(c2)!) {
              crossings++;
            }
          }
        }
      }
    }
  }
  return crossings;
}
