import { DagNode } from "../../dag/node";

/** order a layer with respect to numeric values
 *
 * Nodes without a value will be placed in the final order with as close as
 * possible to their initial position. This is defined as the position with the
 * minimum rank inversion relative to the initial ordering.
 *
 * @remarks
 *
 * This is currently worst case O(n^2), and therefore the bottleneck for
 * otherwise fast twolayer algorithms. This worst case seems unlikely to be
 * reached, so it's not a matter of active concern. This {@link
 * https://cs.stackexchange.com/questions/140295/complexity-to-insert-subset-of-array-to-minimize-order-inversions
 * | Stack Exchange} post is looking for faster alternative.
 */
export function order(
  layer: DagNode[],
  poses: Map<DagNode, number | undefined>
): void {
  // first group by number and preserve order, this makes ties resolve to the
  // same order as layer
  const orderMap = new Map<number, DagNode[]>();
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
  const gaps = Array(ordered.length + 1)
    .fill(null)
    .map(() => [] as DagNode[]);
  let start = 0;
  const left = new Set<DagNode>();

  // find gap for each unassigned node with minimal decrossings
  for (const node of layer) {
    if (poses.get(node) !== undefined) {
      left.add(node);
    } else {
      let last = left.size;
      const inversions = [last];
      for (const ord of ordered.slice(start)) {
        last += left.has(ord) ? -1 : 1;
        inversions.push(last);
      }
      start += inversions.indexOf(Math.min(...inversions));
      gaps[start].push(node);
    }
  }

  // merge gaps with ordered, and replace layer
  const result = gaps.flatMap((g, i) =>
    i === ordered.length ? g : [...g, ordered[i]]
  );
  layer.splice(0, layer.length, ...result);
}
