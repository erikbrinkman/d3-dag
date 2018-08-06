// Assign nodes in each layer an x coordinate in [0, 1] that minimizes curves
import { init, solve, layout } from "./minQp";
import { minDistQ } from "./minDist";

// FIXME Make two versions, one that minimizes all curves, and one that just minimizes dummy curves. Or maybe have it take a parameter that's the weighting?
export default function(layers) {
  const [indices, n, Q, c, A, b] = init(layers);
  
  // Minimize a proxy for the angle of every bend
  layers.forEach(layer => layer.forEach(node => {
    const nind = indices[node.id];
    node.parents.forEach(parent => {
      const pind = indices[parent.id];
      node.children.forEach(child => {
        const cind = indices[child.id];
        Q[nind][nind] += 4;
        Q[pind][pind] += 1;
        Q[cind][cind] += 1;

        Q[pind][cind] += 1;
        Q[cind][pind] += 1;
        Q[nind][pind] -= 2;
        Q[pind][nind] -= 2;
        Q[nind][cind] -= 2;
        Q[cind][nind] -= 2;
      });
    });
  }));

  // Copy before modification
  const Qc = Q.map(row => row.slice());
  const cc = c.slice();
  const Ac = A.map(row => row.slice());
  const bc = b.slice();

  // Initial solution
  // This solution minimizes the bends in the graph, but may not be unique
  const first = solve(Q, c, A, b);

  // Construct new problem that has the same number of bends as previous
  // optimal solution, but not minimizes overall length in order to minimize
  // ties
  const grad = Qc.map(row => row.reduce((s, r, i) => s + r * first[i], 0));
  const Ap = Qc.concat(Ac);
  const bp = grad.concat(bc);
  const Qp = new Array(n).fill(null).map(() => new Array(n).fill(0));
  minDistQ(layers, indices, Qp);

  // Compute new solution
  const solution = solve(Qp, cc, Ap, bp, n);
  layout(layers, indices, solution);
}
