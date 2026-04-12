declare module "quadprog" {
  /** the result of an optimization */
  export interface Result {
    /** the solution */
    solution: number[];
    /** the lagrangian of the solution */
    Lagrangian: number[];
    /** the optimal value of the solution */
    value: [unknown, number];
    /** the solution without constraints */
    unconstrained_solution: number[];
    /** the number of iterations */
    iterations: [unknown, number, number];
    /** the active constraints */
    iact: number[];
    /** an error message */
    message: string;
  }

  /** function to solve a QP */
  export function solveQP(
    Dmat: number[][],
    dvec: number[],
    Amat: number[][],
    bvec: number[],
    meq?: number,
    factorized?: [number, number],
  ): Result;
}
