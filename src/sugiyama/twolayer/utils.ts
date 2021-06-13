/**
 * General utilities for {@link TwolayerOperator}s.
 *
 * @internal
 * @module
 */
import { SugiNode } from "../utils";
import { def } from "../../utils";

/**
 * Order a layer with respect to numeric values
 *
 * Nodes without a value will be placed in the final order with as close as
 * possible to their initial position. This is defined as the position with the
 * minimum rank inversion relative to the initial ordering.
 *
 * @remarks
 *
 * See this {@link
 * https://cs.stackexchange.com/questions/140295/complexity-to-insert-subset-of-array-to-minimize-order-inversions
 * | Stack Exchange} post for algorithmic details.
 */
export function order(
  layer: SugiNode[],
  poses: Map<SugiNode, number | undefined>
): void {
  // first group by number and preserve order, this makes ties resolve to the
  // same order as layer
  const orderMap = new Map<number, SugiNode[]>();
  for (const node of layer) {
    const val = poses.get(node);
    if (val === undefined) {
      continue;
    }
    const nodes = orderMap.get(val);
    if (nodes === undefined) {
      orderMap.set(val, [node]);
    } else {
      nodes.push(node);
    }
  }
  const ordered = [...orderMap.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, nodes]) => nodes);

  // initialize gaps for unassigned nodes
  const inds = new Map(layer.map((n, i) => [n, i] as const));
  const unassigned = layer.filter((n) => poses.get(n) === undefined);
  const placements = new Array(unassigned.length).fill(null);

  // recursively split optimal placement
  function recurse(
    ustart: number,
    uend: number,
    ostart: number,
    oend: number
  ): void {
    if (uend <= ustart) return;
    const umid = Math.floor((ustart + uend) / 2);
    const node = unassigned[umid];
    const nind = def(inds.get(node));

    let last = 0;
    const inversions = [last];
    for (let i = ostart; i < oend; ++i) {
      last += def(inds.get(ordered[i])) < nind ? -1 : 1;
      inversions.push(last);
    }
    const placement = ostart + inversions.indexOf(Math.min(...inversions));
    placements[umid] = placement;

    recurse(ustart, umid, ostart, placement);
    recurse(umid + 1, uend, placement, oend);
  }

  recurse(0, unassigned.length, 0, ordered.length);

  // place nodes
  placements.push(ordered.length + 1); // sentinel
  let insert = 0;
  let uind = 0;
  for (const [i, node] of ordered.entries()) {
    while (placements[uind] == i) {
      layer[insert++] = unassigned[uind++];
    }
    layer[insert++] = node;
  }
  while (placements[uind] == ordered.length) {
    layer[insert++] = unassigned[uind++];
  }
}
