// Assign nodes in each layer an x coordinate in [0, 1] that minimizes link distances
import { init, solve, layout } from "./minQp";

export function minDistQ(layers, indices, Q) {
  layers.forEach(layer => layer.forEach(parent => {
    const pind = indices[parent.id];
    parent.children.forEach(child => {
      const cind = indices[child.id];
      Q[pind][pind] += 1;
      Q[cind][cind] += 1;
      Q[pind][cind] -= 1;
      Q[cind][pind] -= 1;
    });
  }));
}

export default function(layers) {
  const [indices, , Q, c, A, b] = init(layers);
  minDistQ(layers, indices, Q);  
  const solution = solve(Q, c, A, b);
  layout(layers, indices, solution);
}
