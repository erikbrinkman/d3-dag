// TODO when types are published as part of package, use those instead
declare module "javascript-lp-solver" {
  /** a constraint definition */
  export interface Constraint {
    /** the minimum value of the constraint */
    min?: number;
    /** the max value of the constraint */
    max?: number;
  }

  /**
   * a variable definition
   *
   * A mapping of all the constraints or objective values that it contributes
   * to.
   */
  export type Variable = Record<string, number>;

  /** a description of an lp */
  export interface Model {
    /** the variable to optimize */
    optimize: string;
    /** the optimize type */
    opType: "max" | "min";
    /** all constraints */
    constraints: Record<string, Constraint>;
    /** all variables */
    variables: Record<string, Variable>;
    /** integer variables */
    ints: Record<string, 1>;
  }

  /** special keys of the result */
  export interface BaseResult {
    /** if solution was feasible */
    feasible: boolean;
    /** the optimal value */
    result: number;
    /** if the solution was bounded */
    bounded: boolean;
    /** if the solution was integral */
    isIntegral?: boolean;
  }

  /** the result of an optimization */
  export type Result = BaseResult & Record<string, number>;

  /** function to solve an LP */
  export function Solve(args: Model): Result;
}

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
    factorized?: [number, number]
  ): Result;
}

declare module "d3-array" {
  export function median(nums: Iterable<number>): number | undefined;

  export function least<T>(
    vals: Iterable<T>,
    cb: (elem: T) => unknown
  ): T | undefined;
}
