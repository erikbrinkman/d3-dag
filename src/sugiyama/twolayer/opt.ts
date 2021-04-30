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
import { DummyNode } from "../dummy";
import { Operator } from ".";
import { def } from "../../utils";

export type LargeHandling = "small" | "medium" | "large";

export interface OptOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /**
   * Set the large dag handling which will error if you try to decross a dag
   * that is too large. `"small"` the default only allows small graphs.
   * `"medium"` will allow large graphs that may take an unreasonable amount of
   * time to finish. `"large"` allows all graphs, including ones that will
   * likely crash the vm.
   */
  large(val: LargeHandling): OptOperator<NodeType>;
  /** Return the handling of large graphs. */
  large(): LargeHandling;
}

/** @internal */
function buildOperator<NodeType extends DagNode>(options: {
  large: LargeHandling;
}): OptOperator<NodeType> {
  function optCall(
    topLayer: (NodeType | DummyNode)[],
    bottomLayer: (NodeType | DummyNode)[]
  ): void {
    // check if input is too large
    const nodeCost = bottomLayer.length * bottomLayer.length;
    const edgeCost = topLayer.reduce((t, n) => t + n.ichildren().length, 0);
    if (options.large !== "large" && nodeCost > 2500) {
      throw new Error(
        `size of dag to twolayerOpt is too large and will likely crash, enable "large" dags to run anyway`
      );
    } else if (
      options.large !== "large" &&
      options.large !== "medium" &&
      (nodeCost > 900 || edgeCost > 100)
    ) {
      throw new Error(
        `size of dag to twolayerOpt is too large and will likely not finish, enable "medium" dags to run anyway`
      );
    }

    // initialize model
    const model: Model = {
      optimize: "opt",
      opType: "min",
      constraints: Object.create(null),
      variables: Object.create(null),
      ints: Object.create(null)
    };

    // initialize map to create "ids"
    const ids = new Map<NodeType | DummyNode, string>();
    for (const [i, layer] of [topLayer, bottomLayer].entries()) {
      for (const [j, node] of layer.entries()) {
        ids.set(node, `(${i} ${j})`);
      }
    }

    /** create key from nodes */
    function key(...nodes: (NodeType | DummyNode)[]): string {
      return nodes
        .map((n) => def(ids.get(n)))
        .sort()
        .join(" => ");
    }

    /** compare nodes based on ids */
    function comp(n1: NodeType | DummyNode, n2: NodeType | DummyNode): number {
      return def(ids.get(n1)).localeCompare(def(ids.get(n2)));
    }

    // sort bottom layer so ids can be used to see if one node was originally
    // before another one
    bottomLayer.sort(comp);

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
            model.variables[pair].opt += comp(c1, c2);
          }
        }
      }
    }

    // solve objective
    const ordering = Solve(model);

    // sort layers
    bottomLayer.sort(
      /* istanbul ignore next */
      (n1, n2) => comp(n1, n2) * (+ordering[key(n1, n2)] || -1)
    );
  }

  function large(): LargeHandling;
  function large(val: LargeHandling): OptOperator<NodeType>;
  function large(val?: LargeHandling): LargeHandling | OptOperator<NodeType> {
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
export function opt<NodeType extends DagNode>(
  ...args: never[]
): OptOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to opt(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ large: "small" });
}
