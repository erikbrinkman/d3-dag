// Assign coords to layers by solving a QP
import qp from "quadprog-js";

// Compute indices used to index arrays
export function indices(layers) {
  const inds = {};
  let i = 0;
  layers.forEach(layer => layer.forEach(n => inds[n.id] = i++));
  return inds;
}

// Compute constraint arrays for layer separation
export function sep(layers, inds, separation) {
  const n = 1 + Math.max(...Object.values(inds));
  const A = [];
  const b = [];

  layers.forEach(layer => layer.slice(0, layer.length - 1).forEach((first, i) => {
    const second = layer[i + 1];
    const find = inds[first.id];
    const sind = inds[second.id];
    const cons = new Array(n).fill(0);
    cons[find] = 1;
    cons[sind] = -1;
    A.push(cons);
    b.push(-separation(first, second));
  }));

  return [A, b];
}

// Update Q that minimizes edge distance squared
export function minDist(Q, pind, cind, coef) {
  Q[cind][cind] += coef;
  Q[cind][pind] -= coef;
  Q[pind][cind] -= coef;
  Q[pind][pind] += coef;
}

// Update Q that minimizes curve of edges through a node
export function minBend(Q, pind, nind, cind, coef) {
  Q[cind][cind] += coef;
  Q[cind][nind] -= 2 * coef;
  Q[cind][pind] += coef;
  Q[nind][cind] -= 2 * coef;
  Q[nind][nind] += 4 * coef;
  Q[nind][pind] -= 2 * coef;
  Q[pind][cind] += coef;
  Q[pind][nind] -= 2 * coef;
  Q[pind][pind] += coef;
}

// Solve for node positions
export function solve(Q, c, A, b, meq = 0) {
  // Arbitrarily set the last coordinate to 0, which makes the formula valid
  // This is simpler than special casing the last element
  c.pop();
  Q.pop();
  Q.forEach(row => row.pop());
  A.forEach(row => row.pop());

  // Solve
  const { solution } = qp(Q, c, A, b, meq);

  // Undo last coordinate removal
  solution.push(0);
  return solution
}

// Assign nodes x in [0, 1] based on solution
export function layout(layers, inds, solution) {
  // Rescale to be in [0, 1]
  const min = Math.min(...solution);
  const span = Math.max(...solution) - min;
  layers.forEach(layer => layer.forEach(n => n.x = (solution[inds[n.id]] - min) / span));
}
