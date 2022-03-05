import { Constraint, Solve, Variable } from "javascript-lp-solver";
export type { Constraint, Variable };

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
      ints
    }
  );
  if (!feasible) {
    throw new Error("could not find a feasible simplex solution");
  }
  return assignment;
}
