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
export function sep(layers, inds) {
  const n = Object.keys(inds).length;
  const A = [];
  const b = [];

  layers.forEach(layer => layer.slice(0, layer.length - 1).forEach((first, i) => {
    const find = inds[first.id];
    const sind = inds[layer[i + 1].id];
    const cons = new Array(n).fill(0);
    cons[find] = 1;
    cons[sind] = -1;
    A.push(cons);
    // TODO This could be tweaked to space different pairs different relative amounts apart
    b.push(-1);
  }));

  return [A, b];
}

// Compute Q that minimizes edge distance squared
export function minDist(layers, inds) {
  const n = Object.keys(inds).length;
  const Q = new Array(n).fill(null).map(() => new Array(n).fill(0));
  layers.forEach(layer => layer.forEach(parent => {
    const pind = inds[parent.id];
    parent.children.forEach(child => {
      const cind = inds[child.id];
      Q[pind][pind] += 1;
      Q[cind][cind] += 1;
      Q[pind][cind] -= 1;
      Q[cind][pind] -= 1;
    });
  }));
  return Q;
}

// Compute Q that minimizes curve of edges through a node
// This Q will be singular, so it's necessary to combine with another Q
export function minBend(layers, inds, filter = () => true) {
  const n = Object.keys(inds).length;
  const Q = new Array(n).fill(null).map(() => new Array(n).fill(0));
  layers.forEach(layer => layer.forEach(parent => {
    const pind = inds[parent.id];
    parent.children.forEach(node => {
      if (filter(node)) {
        const nind = inds[node.id];
        node.children.forEach(child => {
          const cind = inds[child.id];
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
      }
    });
  }));
  return Q;
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
