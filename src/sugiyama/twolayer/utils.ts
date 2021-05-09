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
  const ordered = [...poses.entries()]
    .filter((ent): ent is [DagNode, number] => ent[1] !== undefined)
    .sort(([, a], [, b]) => a - b)
    .map(([n]) => n);
  const gaps = Array(ordered.length + 1)
    .fill(null)
    .map(() => [] as DagNode[]);
  let start = 0;
  const left = new Set<DagNode>();

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
  layer.splice(
    0,
    layer.length,
    ...gaps.flatMap((g, i) => (i === ordered.length ? g : [...g, ordered[i]]))
  );
}
