// Assign nodes in each layer an x coordinate in [0, 1] that minimizes link distances
import { indices, sep, minDist, solve, layout } from "./minQp";

export default function(layers) {
  const inds = indices(layers);
  const n = Object.keys(inds).length;
  const Q = minDist(layers, inds);
  const c = new Array(n).fill(0);
  const [A, b] = sep(layers, inds);
  const solution = solve(Q, c, A, b);
  layout(layers, inds, solution);
  return layers;
}
