/**
 * The opt order operator orders the bottom layer to minimize the number of
 * crossings. This is expensive, but not nearly as expensive as optimizing all
 * crossings initially.
 *
 * <img alt="two layer opt example" src="media://two_layer_opt.png" width="400">
 *
 * @module
 */
import { Model, Solve } from "javascript-lp-solver";

import { DagNode } from "../../dag/node";
import { Operator } from ".";
import { def } from "../../utils";

export type LargeHandling = "small" | "medium" | "large";

export interface OptOperator extends Operator<DagNode> {
  /**
   * Set the large dag handling which will error if you try to decross a dag
   * that is too large. `"small"` the default only allows small graphs.
   * `"medium"` will allow large graphs that may take an unreasonable amount of
   * time to finish. `"large"` allows all graphs, including ones that will
   * likely crash the vm.
   */
  large(val: LargeHandling): OptOperator;
  /** Return the handling of large graphs. */
  large(): LargeHandling;
}

/** @internal */
function buildOperator(options: { large: LargeHandling }): OptOperator {
  function optCall(
    topLayer: DagNode[],
    bottomLayer: DagNode[],
    topDown: boolean
  ): void {
    // check if input is too large
    const reordered = topDown ? bottomLayer : topLayer;
    const numVars = (reordered.length * Math.max(reordered.length - 1, 0)) / 2;
    const numEdges = topLayer.reduce((t, n) => t + n.ichildren().length, 0);
    if (options.large !== "large" && numVars > 1200) {
      throw new Error(
        `size of dag to twolayerOpt is too large and will likely crash, enable "large" dags to run anyway`
      );
    } else if (
      options.large !== "large" &&
      options.large !== "medium" &&
      (numVars > 400 || numEdges > 100)
    ) {
      throw new Error(
        `size of dag to twolayerOpt is too large and will likely not finish, enable "medium" dags to run anyway`
      );
    }

    // initialize model
    const model: Model = {
      optimize: "opt",
      opType: "min",
      constraints: {},
      variables: {},
      ints: {}
    };

    // initialize map to create ids for labeling constraints
    const inds = new Map(reordered.map((node, i) => [node, i] as const));

    /** create key from nodes */
    function key(...nodes: DagNode[]): string {
      return nodes
        .map((n) => def(inds.get(n)))
        .sort((a, b) => a - b)
        .join(" => ");
    }

    // need a function that returns whether one child originally came before
    // another, which means we need a reverse map from node to original index
    const cinds = new Map(bottomLayer.map((node, i) => [node, i] as const));

    // add variables for each pair of bottom later nodes indicating if they
    // should be flipped
    for (const [i, n1] of reordered.slice(0, reordered.length - 1).entries()) {
      for (const n2 of reordered.slice(i + 1)) {
        const pair = key(n1, n2);
        model.ints[pair] = 1;
        model.constraints[pair] = {
          max: 1
        };
        model.variables[pair] = {
          // add small value to objective for preserving the original order of nodes
          opt: -1 / (numVars + 1),
          [pair]: 1
        };
      }
    }

    // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
    // and b -> c is 1 then a -> c must also be one
    for (const [i, n1] of reordered.slice(0, reordered.length - 1).entries()) {
      for (const [j, n2] of reordered.slice(i + 1).entries()) {
        for (const n3 of reordered.slice(i + j + 2)) {
          const pair1 = key(n1, n2);
          const pair2 = key(n1, n3);
          const pair3 = key(n2, n3);
          const triangle = key(n1, n2, n3);

          const triangleUp = triangle + "+";
          model.constraints[triangleUp] = {
            max: 1
          };
          model.variables[pair1][triangleUp] = 1;
          model.variables[pair2][triangleUp] = -1;
          model.variables[pair3][triangleUp] = 1;

          const triangleDown = triangle + "-";
          model.constraints[triangleDown] = {
            min: 0
          };
          model.variables[pair1][triangleDown] = 1;
          model.variables[pair2][triangleDown] = -1;
          model.variables[pair3][triangleDown] = 1;
        }
      }
    }

    // add crossing minimization
    for (const [i, p1] of topLayer.slice(0, topLayer.length - 1).entries()) {
      for (const p2 of topLayer.slice(i + 1)) {
        for (const c1 of p1.ichildren()) {
          for (const c2 of p2.ichildren()) {
            if (c1 === c2) {
              continue;
            }
            const pair = topDown ? key(c1, c2) : key(p1, p2);
            model.variables[pair].opt += Math.sign(
              def(cinds.get(c1)) - def(cinds.get(c2))
            );
          }
        }
      }
    }

    // solve objective
    const ordering = Solve(model);

    // sort layers
    reordered.sort(
      /* istanbul ignore next */
      (n1, n2) => ordering[key(n1, n2)] || -1
    );
  }

  function large(): LargeHandling;
  function large(val: LargeHandling): OptOperator;
  function large(val?: LargeHandling): LargeHandling | OptOperator {
    if (val === undefined) {
      return options.large;
    } else {
      return buildOperator({ ...options, large: val });
    }
  }
  optCall.large = large;

  return optCall;
}

/** Create a default {@link OptOperator}. */
export function opt(...args: never[]): OptOperator {
  if (args.length) {
    throw new Error(
      `got arguments to opt(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ large: "small" });
}
