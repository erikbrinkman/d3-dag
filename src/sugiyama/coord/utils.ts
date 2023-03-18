/**
 * Utilities for quadratic optimization
 *
 * @internal
 * @packageDocumentation
 */
import { solveQP } from "quadprog";
import { GraphNode } from "../../graph";
import { bigrams, flatMap, map } from "../../iters";
import { ierr } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";
import { aggMean } from "../twolayer/agg";

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
  /* istanbul ignore if */
  if (message.length) {
    throw ierr`quadratic program failed: ${message}`;
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
export function indices<N, L>(
  layers: SugiNode<N, L>[][]
): Map<SugiNode<N, L>, number> {
  const mapping = new Map<SugiNode<N, L>, number>();
  let i = 0;
  for (const layer of layers) {
    for (const node of layer) {
      if (!mapping.has(node)) {
        mapping.set(node, i++);
      }
    }
  }
  return mapping;
}

/** Compute constraint arrays for layer separation */
export function init<N, L>(
  layers: SugiNode<N, L>[][],
  inds: Map<SugiNode, number>,
  sep: SugiSeparation<N, L>,
  compress: number = 0
): [number[][], number[], number[][], number[]] {
  // NOTE max because we might assign a node the same index
  const n = 1 + Math.max(...inds.values());

  const Q = Array<null>(n)
    .fill(null)
    .map((_, i) =>
      Array<null>(n)
        .fill(null)
        .map((_, j) => (i === j ? compress : 0))
    );
  const c = Array<number>(n).fill(0);
  const A: number[][] = [];
  const b: number[] = [];

  for (const layer of layers) {
    for (const [first, second] of bigrams(layer)) {
      const find = inds.get(first)!;
      const sind = inds.get(second)!;
      const cons = Array<number>(n).fill(0);
      cons[find] = 1;
      cons[sind] = -1;
      A.push(cons);
      b.push(-sep(first, second));
    }
  }

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
  pcoef: number,
  ccoef: number
): void {
  const ncoef = pcoef + ccoef;
  Q[cind][cind] += ccoef * ccoef;
  Q[cind][nind] -= ccoef * ncoef;
  Q[cind][pind] += ccoef * pcoef;
  Q[nind][cind] -= ncoef * ccoef;
  Q[nind][nind] += ncoef * ncoef;
  Q[nind][pind] -= ncoef * pcoef;
  Q[pind][cind] += pcoef * ccoef;
  Q[pind][nind] -= pcoef * ncoef;
  Q[pind][pind] += pcoef * pcoef;
}

/**
 * Assign nodes x based off of solution, and return the width of the final
 * layout.
 */
export function layout<N, L>(
  layers: SugiNode<N, L>[][],
  sep: SugiSeparation<N, L>,
  inds: Map<SugiNode, number>,
  solution: number[]
): number {
  // assign solution
  for (const [node, key] of inds) {
    node.x = solution[key];
  }

  // find span of solution
  let start = Infinity;
  let finish = -Infinity;
  for (const layer of layers) {
    const first = layer[0];
    const last = layer[layer.length - 1];

    start = Math.min(start, first.x - sep(undefined, first));
    finish = Math.max(finish, last.x + sep(last, undefined));
  }

  // assign indices based off of span
  for (const node of inds.keys()) {
    node.x -= start;
  }

  // return width
  return finish - start;
}

export function avgHeight(nodes: Iterable<GraphNode>): number {
  // NOTE graph is guaranteed not to be multi
  return aggMean(
    flatMap(nodes, (node) => map(node.children(), (child) => child.y - node.y))
  )!;
}
