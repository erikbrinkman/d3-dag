import { default as qp } from "quadprog-js";

function computeIndices(layers) {
  const indices = {};
  let i = 0;
  layers.forEach(layer => layer.forEach(n => indices[n.id] = i++));
  return [indices, i];
}

export default function(layers) {
  const width = Math.max(...layers.map(l => l.length));
  if (width === 1) {
    layers.forEach(([n]) => n.x = 1 / 2);
  } else {
    const [indices, n] = computeIndices(layers);
    const Q = new Array(n).fill(null).map(() => new Array(n).fill(0));
    const c = new Array(n).fill(0);
    const A = [];
    const b = [];
    
    // Minimize distance between parents and children
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

    // Arbitrarily set the last coordinate to 0, which makes the formula valid
    // This is simpler than special casing the last element
    c.pop();
    Q.pop();
    Q.forEach(row => row.pop());
    A.forEach(row => row.pop());

    // Solve
    const { solution } = qp(Q, c, A, b, 1);

    // Actually set last coordinate to 0
    solution.push(0);

    // Rescale to be in [0, 1]
    const min = Math.min(...solution);
    const span = Math.max(...solution) - min;
    layers.forEach(layer => layer.forEach(n => n.x = (solution[indices[n.id]] - min) / span));
  }
}
