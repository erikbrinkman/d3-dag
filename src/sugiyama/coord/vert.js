// Assign nodes in each layer an x coordinate in [0, 1] that minimizes curves
import { indices, sep, minDist, minBend, solve, layout } from "./minQp";

export default function() {
  function coordVert(layers, separation) {
    const inds = indices(layers);
    const n = Object.keys(inds).length;
    const [A, b] = sep(layers, inds, separation);

    const c = new Array(n).fill(0);
    const Q = new Array(n).fill(null).map(() => new Array(n).fill(0));
    layers.forEach((layer) =>
      layer.forEach((parent) => {
        const pind = inds[parent.id];
        parent.children.forEach((child) => {
          const cind = inds[child.id];
          if (parent.data) {
            minDist(Q, pind, cind, 1);
          }
          if (child.data) {
            minDist(Q, pind, cind, 1);
          }
        });
      })
    );

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

  return coordVert;
}
