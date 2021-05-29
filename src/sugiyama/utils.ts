import { Dag, DagNode } from "../dag/node";
import { assert, def, js } from "../utils";

import { hierarchy } from "../dag/hierarchy";

type SugiData<N, L> =
  | { layer: number; node: DagNode<N, L> }
  | {
      layer: number;
      source: DagNode<N, L>;
      target: DagNode<N, L>;
    };
export type SugiNode<NodeDatum = unknown, LinkDatum = unknown> = DagNode<
  SugiData<NodeDatum, LinkDatum>,
  undefined
>;
export type SugiDag<NodeDatum = unknown, LinkDatum = unknown> = Dag<
  SugiData<NodeDatum, LinkDatum>,
  undefined
>;

/** validate layer assignments @internal */
function vlayer(node: DagNode): number {
  assert(
    node.value !== undefined,
    js`node with data '${node.data}' did not get a defined value during layering`
  );
  assert(
    node.value >= 0,
    js`node with data '${node.data}' got an invalid (negative) value during layering: ${node.value}`
  );
  return node.value;
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
    dag
      .idescendants()
      .map((node) => [node, { node, layer: vlayer(node) }] as const)
  );

  // children function
  function augment(data: SugiData<N, L>): SugiData<N, L>[] {
    const layer = data.layer + 1;
    const targets = "node" in data ? data.node.children() : [data.target];
    const source = "node" in data ? data.node : data.source;
    return targets.map((target) => {
      const datum = def(cache.get(target));
      assert(
        datum.layer >= layer,
        js`layering left child data '${target.data}' (${target.value}) with greater or equal layer to parent data '${source.data}' (${source.value})`
      );
      return datum.layer === layer ? datum : { source, target, layer };
    });
  }

  // create sugi dag
  const sugi = hierarchy().children(augment)(
    ...dag.iroots().map((node) => def(cache.get(node)))
  );

  // assign nodes to layer
  const layers: SugiNode<N, L>[][] = [];
  for (const node of sugi) {
    const layer = layers[node.data.layer] || (layers[node.data.layer] = []);
    layer.push(node);
  }
  assert(layers[0] && layers[0].length, "no nodes were assigned to layer 0");
  for (const [i, layer] of layers.entries()) {
    assert(layer && layer.length, `internal error: layer ${i} was empty`);
  }
  return layers;
}
