/**
 * Utility types for sugiyama layout
 *
 * This module should only really matter for those looking to develop custom
 * {@link CoordOperator}s, {@link DecrossOperator}s, or in the rare case
 * advanced {@link SugiNodeSizeAccessor}s.
 *
 * @module
 */
import { Dag, DagNode } from "../dag";
import { hierarchy } from "../dag/create";
import { map } from "../iters";
import { assert, def, js } from "../utils";

/**
 * The NodeDatum used for layered {@link SugiyamaOperator} layouts
 *
 * Nodes in the original graph have a layer and a reference to the original
 * node. "dummy nodes" have a link to the parent and child of the edge their on
 * in the original dag, as well as their actual layer. Given that duplicate
 * edges aren't allowed, this uniquely defines each dummy node.
 */
export type SugiData<NodeDatum = unknown, LinkDatum = unknown> =
  | { layer: number; node: DagNode<NodeDatum, LinkDatum> }
  | {
      layer: number;
      source: DagNode<NodeDatum, LinkDatum>;
      target: DagNode<NodeDatum, LinkDatum>;
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

/** @internal get DagNode from SugiData */
export type SugiDataDagNode<S extends SugiData> = S extends {
  node: DagNode;
}
  ? S["node"]
  : never;
/** @internal get NodeDatum from DagNode */
export type NodeDatum<D extends DagNode> = D["data"];
/** @internal get LinkDatum from DagNode */
export type LinkDatum<D extends DagNode> = ReturnType<
  D["childLinks"]
>[number]["data"];

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
 * Convert a layered dag (one where each node has a non-negative integer value
 * that corresponds to its layer) into a layered set of sugi nodes, which
 * contain the wrapped nodes for real nodes, or links to the source and target
 * nodes for dummy nodes.
 *
 * @internal
 */
export function sugify<N, L>(dag: Dag<N, L>): SugiNode<N, L>[][] {
  // NOTE we need to cache so that the returned 'SugiData' are the same
  const cache = new Map(
    map(
      dag.idescendants(),
      (node) => [node, { node, layer: vlayer(node) }] as const
    )
  );

  // children function
  function augment(data: SugiData<N, L>): SugiData<N, L>[] {
    const layer = data.layer + 1;
    const targets = "node" in data ? data.node.children() : [data.target];
    const source = "node" in data ? data.node : data.source;
    return targets.map((target) => {
      const datum = def(cache.get(target));
      if (datum.layer < layer) {
        throw new Error(
          js`layering left child data '${target.data}' (${target.value}) with greater or equal layer to parent data '${source.data}' (${source.value})`
        );
      }
      return datum.layer === layer ? datum : { source, target, layer };
    });
  }

  // create sugi dag
  const sugi = hierarchy().children(augment)(
    ...map(dag.iroots(), (node) => def(cache.get(node)))
  );

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
