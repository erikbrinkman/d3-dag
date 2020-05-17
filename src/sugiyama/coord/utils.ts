import { HorizableNode, Separation } from ".";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { SafeMap } from "../../utils";
import { solveQP } from "quadprog";

// wrapper for solveQP
function qp(
  Q: number[][],
  c: number[],
  A: number[][],
  b: number[],
  meq: number
): number[] {
  const Dmat = [[0]];
  const dvec = [0];
  const Amat = [[0]];
  const bvec = [0];

  for (const qRow of Q) {
    const newRow = [0];
    newRow.push(...qRow);
    Dmat.push(newRow);
  }
  dvec.push(...c);
  Amat.push(...c.map(() => [0]));
  for (const aRow of A) {
    for (const [j, val] of aRow.entries()) {
      Amat[j + 1].push(-val);
    }
  }
  bvec.push(...b.map((v) => -v));

  const { solution, message } = solveQP(Dmat, dvec, Amat, bvec, meq);
  /* istanbul ignore next */
  if (message.length) {
    throw new Error(`quadprog failed with: ${message}`);
  }
  solution.shift();
  return solution;
}

// solve for node positions
export function solve(
  Q: number[][],
  c: number[],
  A: number[][],
  b: number[],
  meq: number = 0
): number[] {
  // Arbitrarily set the last coordinate to 0 (by removing it from the
  // equation), which makes the formula valid This is simpler than special
  // casing the last element
  c.pop();
  Q.pop();
  Q.forEach((row) => row.pop());
  A.forEach((row) => row.pop());

  // Solve
  const solution = qp(Q, c, A, b, meq);

  // Undo last coordinate removal
  solution.push(0);
  return solution;
}

// compute indices used to index arrays
export function indices<NodeType extends DagNode>(
  layers: (NodeType | DummyNode)[][]
): SafeMap<string, number> {
  const inds = new SafeMap<string, number>();
  let i = 0;
  for (const layer of layers) {
    for (const node of layer) {
      inds.set(node.id, i++);
    }
  }
  return inds;
}

// Compute constraint arrays for layer separation
export function init<NodeType extends DagNode>(
  layers: (NodeType | DummyNode)[][],
  inds: SafeMap<string, number>,
  separation: Separation<NodeType>
): [number[][], number[], number[][], number[]] {
  const n = 1 + Math.max(...inds.values());
  const A: number[][] = [];
  const b: number[] = [];

  for (const layer of layers) {
    let [first, ...rest] = layer;
    for (const second of rest) {
      const find = inds.getThrow(first.id);
      const sind = inds.getThrow(second.id);
      const cons = new Array(n).fill(0);
      cons[find] = 1;
      cons[sind] = -1;
      A.push(cons);
      b.push(-separation(first, second));
      first = second;
    }
  }

  const c = new Array(n).fill(0);
  const Q = new Array(n).fill(null).map(() => new Array(n).fill(0));

  return [Q, c, A, b];
}

// update Q that minimizes edge distance squared
export function minDist(
  Q: number[][],
  pind: number,
  cind: number,
  coef: number
): void {
  Q[cind][cind] += coef;
  Q[cind][pind] -= coef;
  Q[pind][cind] -= coef;
  Q[pind][pind] += coef;
}

// update Q that minimizes curve of edges through a node
// where curve is calcukates as the squared distance of the middle node from
// the midpoint of the first and last, multiplied by four for some reason
export function minBend(
  Q: number[][],
  pind: number,
  nind: number,
  cind: number,
  coef: number
): void {
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

// Assign nodes x in [0, 1] based on solution
export function layout<NodeType extends DagNode>(
  layers: ((NodeType & HorizableNode) | DummyNode)[][],
  inds: SafeMap<string, number>,
  solution: number[]
): void {
  // Rescale to be in [0, 1]
  const min = Math.min(...solution);
  const span = Math.max(...solution) - min;
  for (const layer of layers) {
    for (const node of layer) {
      const index = inds.getThrow(node.id);
      node.x = (solution[index] - min) / span;
    }
  }
}
