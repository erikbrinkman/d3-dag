// Assign nodes in each layer an x coordinate in [0, 1] that minimizes curves
import { indices, sep, minDist, minBend, solve, layout } from "./minQp";

export default function() {
  let weight = 1000;
  
  function coordMinCurve(layers) {
    const inds = indices(layers);
    const n = Object.keys(inds).length;
    const Q1 = minDist(layers, inds);
    const Q2 = minBend(layers, inds);
    const Q = Q1.map((r, i) => r.map((v, j) => v / (weight * n * n) + Q2[i][j]));
    const c = new Array(n).fill(0);
    const [A, b] = sep(layers, inds);
    
    const solution = solve(Q, c, A, b);
    layout(layers, inds, solution);
    return layers;
  }

  return coordMinCurve;
}
