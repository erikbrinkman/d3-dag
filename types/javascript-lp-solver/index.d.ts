// TODO when tpes are published as part of package, use those instead
declare module "javascript-lp-solver" {
  export interface SolverDict<T> {
    [key: string]: T;
  }

  export interface Constraint {
    min?: number;
    max?: number;
  }

  // technically the optimization parameter can be anything, but we constrain
  // to "opt" for brevity and easier type checking
  export interface Variable {
    opt: number;
    [key: string]: number;
  }

  export interface Model {
    optimize: "opt";
    opType: "max" | "min";
    constraints: SolverDict<Constraint>;
    variables: SolverDict<Variable>;
    ints: SolverDict<number>;
  }

  export function Solve(args: Model): SolverDict<number>;
}
