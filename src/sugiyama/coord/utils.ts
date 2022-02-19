/**
 * Utilities for quadratic optimization
 *
 * @internal
 * @module
 */
import { solveQP } from "quadprog";
import { CoordNodeSizeAccessor } from ".";
import { bigrams } from "../../utils";
import { SugiNode } from "../utils";

/** wrapper for solveQP */
function qp(
  Q: number[][],
  c: number[],
  A: number[][],
  b: number[],
  meq: number
): number[] {
  if (!c.length) {
    return [];
  }

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
  if (message.length) {
    throw new Error(`quadratic program failed: ${message}`);
  }
  solution.shift();
  return solution;
}

/** solve for node positions */
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

/** compute indices used to index arrays */
export function indices(layers: SugiNode[][]): Map<SugiNode, number> {
  return new Map(
    layers.flatMap((layer) => layer).map((n, i) => [n, i] as const)
  );
}

/** Compute constraint arrays for layer separation */
export function init<N, L>(
  layers: SugiNode<N, L>[][],
  inds: Map<SugiNode, number>,
  nodeSize: CoordNodeSizeAccessor<N, L>
): [number[][], number[], number[][], number[]] {
  // NOTE max because we might assign a node the same index
  const n = 1 + Math.max(...inds.values());
  const A: number[][] = [];
  const b: number[] = [];

  for (const layer of layers) {
    for (const [first, second] of bigrams(layer)) {
      const find = inds.get(first)!;
      const sind = inds.get(second)!;
      const cons = new Array(n).fill(0);
      cons[find] = 1;
      cons[sind] = -1;
      A.push(cons);
      b.push(-(nodeSize(first) + nodeSize(second)) / 2);
    }
  }

  const c = new Array(n).fill(0);
  const Q = [...new Array(n)].map(() => new Array(n).fill(0));

  return [Q, c, A, b];
}

/** update Q that minimizes edge distance squared */
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

/**
 * update Q that minimizes curve of edges through a node where curve is
 * calculates as the squared distance of the middle node from the midpoint of
 * the first and last, multiplied by four for some reason
 */
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

/**
 * Assign nodes x based off of solution, and return the width of the final
 * layout.
 */
export function layout<N, L>(
  layers: SugiNode<N, L>[][],
  nodeSize: CoordNodeSizeAccessor<N, L>,
  inds: Map<SugiNode, number>,
  solution: number[]
): number {
  // find span of solution
  let start = Number.POSITIVE_INFINITY;
  let finish = Number.NEGATIVE_INFINITY;
  for (const layer of layers) {
    const first = layer[0];
    const last = layer[layer.length - 1];

    start = Math.min(start, solution[inds.get(first)!] - nodeSize(first) / 2);
    finish = Math.max(finish, solution[inds.get(last)!] + nodeSize(last) / 2);
  }
  const width = finish - start;

  // assign indices based off of span
  for (const layer of layers) {
    for (const node of layer) {
      node.x = Math.min(Math.max(0, solution[inds.get(node)!] - start), width);
    }
  }

  // return width
  return width;
}
