// Assign coords to layers by solving a QP
import { default as qp } from "quadprog-js";

export function init(layers) {
  const indices = {};
  let i = 0;
  layers.forEach(layer => layer.forEach(n => indices[n.id] = i++));
  const n = i;

  const Q = new Array(n).fill(null).map(() => new Array(n).fill(0));
  const c = new Array(n).fill(0);
  const A = [];
  const b = [];

  // Make sure elements on the same row are at least one apart
  layers.forEach(layer => layer.slice(0, layer.length - 1).forEach((first, i) => {
    const find = indices[first.id];
    const sind = indices[layer[i + 1].id];
    const cons = new Array(n).fill(0);
    cons[find] = 1;
    cons[sind] = -1;
    A.push(cons);
    // TODO This could be tweaked to space different pairs different relative amounts apart
    b.push(-1);
  }));

  return [indices, n, Q, c, A, b];
}

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

export function layout(layers, indices, solution) {
  // Rescale to be in [0, 1]
  const min = Math.min(...solution);
  const span = Math.max(...solution) - min;
  layers.forEach(layer => layer.forEach(n => n.x = (solution[indices[n.id]] - min) / span));
}
