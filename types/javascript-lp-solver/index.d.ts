// TODO when tpes are published as part of package, use those instead
declare module "javascript-lp-solver" {
  export interface Constraint {
    min?: number;
    max?: number;
  }

  // technically the optimization parameter can be anything, but we constrain
  // to "opt" for brevity and easier type checking
  export type Variable = Record<string, number>;

  export interface Model {
    optimize: string;
    opType: "max" | "min";
    constraints: Record<string, Constraint>;
    variables: Record<string, Variable>;
    ints: Record<string, 1>;
  }

  export interface BaseResult {
    feasible: boolean;
    result: number;
    bounded: boolean;
    isIntegral?: boolean;
  }

  export type Result = BaseResult & Record<string, number>;

  export function Solve(args: Model): Result;
}
