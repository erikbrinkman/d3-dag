// Assign nodes in each layer an x coordinate in [0, 1] that minimizes curves
import { indices, sep, minDist, minBend, solve, layout } from "./minQp";

function checkWeight(weight) {
  if (weight < 0 || weight >= 1) {
    throw new Error(`weight must be in [0, 1), but was ${weight}`);
  } else {
    return weight;
  }
}

export default function() {
  let weight = 0.5;

  function coordMinCurve(layers, separation) {
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
          minDist(Q, pind, cind, 1 - weight);
        });
      }),
    );

    layers.forEach((layer) =>
      layer.forEach((parent) => {
        const pind = inds[parent.id];
        parent.children.forEach((node) => {
          const nind = inds[node.id];
          node.children.forEach((child) => {
            const cind = inds[child.id];
            minBend(Q, pind, nind, cind, weight);
          });
        });
      }),
    );

    const solution = solve(Q, c, A, b);
    layout(layers, inds, solution);
    return layers;
  }

  coordMinCurve.weight = function(x) {
    return arguments.length
      ? ((weight = checkWeight(x)), coordMinCurve)
      : weight;
  };

  return coordMinCurve;
}
