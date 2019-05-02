// Assign nodes in each layer an x coordinate in [0, 1] that minimizes curves
import { sep, minBend, solve, layout } from "./minQp";

export default function() {
  function coordTopological(layers, separation) {
    if (
      !layers.every((layer) => 1 === layer.reduce((c, n) => c + !!n.data, 0))
    ) {
      throw new Error(
        "coordTopological() only works with a topological ordering"
      );
    }

    // This takes advantage that the last "node" is set to 0
    const inds = {};
    let i = 0;
    layers.forEach((layer) =>
      layer.forEach((n) => n.data || (inds[n.id] = i++))
    );
    layers.forEach((layer) =>
      layer.forEach((n) => inds[n.id] === undefined && (inds[n.id] = i))
    );

    const n = ++i;
    const [A, b] = sep(layers, inds, separation);

    const c = new Array(n).fill(0);
    const Q = new Array(n).fill(null).map(() => new Array(n).fill(0));
    layers.forEach((layer) =>
      layer.forEach((parent) => {
        const pind = inds[parent.id];
        parent.children.forEach((node) => {
          if (!node.data) {
            const nind = inds[node.id];
            node.children.forEach((child) => {
              const cind = inds[child.id];
              minBend(Q, pind, nind, cind, 1);
            });
          }
        });
      })
    );

    const solution = solve(Q, c, A, b);
    layout(layers, inds, solution);
    return layers;
  }

  return coordTopological;
}
