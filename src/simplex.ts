import { Constraint, Solve, Variable } from "javascript-lp-solver";
import { ierr } from "./utils";
export type { Constraint, Variable };

/** solve an lp with a better interface */
export function solve(
  optimize: string,
  opType: "max" | "min",
  variables: Record<string, Variable>,
  constraints: Record<string, Constraint>,
  ints: Record<string, 1> = {}
): Record<string, number> {
  // NOTE bundling sets `this` to undefined, and we need it to be settable
  const { feasible, ...assignment } = Solve.call(
    {},
    {
      optimize,
      opType,
      constraints,
      variables,
      ints,
    }
  );
  if (!feasible) {
    throw ierr`could not find a feasible simplex solution`;
  }
  return assignment;
}
