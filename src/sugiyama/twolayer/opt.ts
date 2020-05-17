/**
 * The opt order operator orders the bottom layer to minimize the number of
 * crossings. This is expensive, but not nearly as expensive as optimizing all
 * crossings initially.
 *
 * <img alt="two layer opt example" src="media://two_layer_opt.png" width="400">
 *
 * @packageDocumentation
 */
import { Model, Solve } from "javascript-lp-solver";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { Operator } from ".";

export interface OptOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /** Set the debug value. If debug is true, the optimization formulation will
   * be given more human readable names that help debugging the optimization,
   * but may cause conflicts if used with poorly chosen node ids.
   */
  debug(val: boolean): OptOperator<NodeType>;
  /** Return the current debug value. */
  debug(): boolean;
}

/** @internal */
function buildOperator<NodeType extends DagNode>(
  debugVal: boolean
): OptOperator<NodeType> {
  const joiner = debugVal ? " => " : "\0\0";

  function key(...nodes: (NodeType | DummyNode)[]): string {
    return nodes
      .map((n) => n.id)
      .sort()
      .join(joiner);
  }

  function optCall(
    topLayer: (NodeType | DummyNode)[],
    bottomLayer: (NodeType | DummyNode)[]
  ): void {
    // initialize model
    const model: Model = {
      optimize: "opt",
      opType: "min",
      constraints: Object.create(null),
      variables: Object.create(null),
      ints: Object.create(null)
    };

    // sort bottom layer so ids can be used to see if one node was originally
    // before another one
    bottomLayer.sort((n1, n2) => +(n1.id > n2.id) || -1);

    // add variables for each pair of bottom later nodes indicating if they
    // should be flipped
    for (const [i, n1] of bottomLayer
      .slice(0, bottomLayer.length - 1)
      .entries()) {
      for (const n2 of bottomLayer.slice(i + 1)) {
        const pair = key(n1, n2);
        model.ints[pair] = 1;
        model.constraints[pair] = Object.assign(Object.create(null), {
          max: 1
        });
        model.variables[pair] = Object.assign(Object.create(null), {
          opt: 0,
          [pair]: 1
        });
      }
    }

    // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
    // and b -> c is 1 then a -> c must also be one
    for (const [i, n1] of bottomLayer
      .slice(0, bottomLayer.length - 1)
      .entries()) {
      for (const [j, n2] of bottomLayer.slice(i + 1).entries()) {
        for (const n3 of bottomLayer.slice(i + j + 2)) {
          const pair1 = key(n1, n2);
          const pair2 = key(n1, n3);
          const pair3 = key(n2, n3);
          const triangle = key(n1, n2, n3);

          const triangleUp = triangle + "+";
          model.constraints[triangleUp] = Object.assign(Object.create(null), {
            max: 1
          });
          model.variables[pair1][triangleUp] = 1;
          model.variables[pair2][triangleUp] = -1;
          model.variables[pair3][triangleUp] = 1;

          const triangleDown = triangle + "-";
          model.constraints[triangleDown] = Object.assign(Object.create(null), {
            min: 0
          });
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
            const pair = key(c1, c2);
            model.variables[pair].opt += +(c1.id > c2.id) || -1;
          }
        }
      }
    }

    // solve objective
    const ordering = Solve(model);

    // sort layers
    bottomLayer.sort(
      /* istanbul ignore next */
      (n1, n2) => (+(n1.id > n2.id) || -1) * (+ordering[key(n1, n2)] || -1)
    );
  }

  function debug(): boolean;
  function debug(val: boolean): OptOperator<NodeType>;
  function debug(val?: boolean): boolean | OptOperator<NodeType> {
    if (val === undefined) {
      return debugVal;
    } else {
      return buildOperator(val);
    }
  }
  optCall.debug = debug;

  return optCall;
}

/** Create a default [[OptOperator]]. */
export function opt<NodeType extends DagNode>(
  ...args: never[]
): OptOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to opt(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(false);
}
