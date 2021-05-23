/**
 * Create a decrossing operator that minimizes the the number of edge
 * crossings. This method solves an np-complete integer program, and as such
 * can take a very long time for large DAGs.
 *
 * Create a new {@link OptOperator} with {@link opt}.
 *
 * <img alt="optimal decross example" src="media://simplex.png" width="400">
 *
 * @module
 */
import { Model, Solve } from "javascript-lp-solver";
import { bigrams, def } from "../../utils";

import { DagNode } from "../../dag/node";
import { DecrossOperator } from ".";

export type LargeHandling = "small" | "medium" | "large";

export interface OptOperator extends DecrossOperator {
  /**
   * Set the large dag handling, which will error if you try to decross DAGs
   * that are too large. Since this operator is so expensive, this exists
   * mostly to protect you from stalling. `"small"` the default only allows
   * small graphs. `"medium"` will allow large graphs that may take an
   * unreasonable amount of time to finish. `"large"` allows all graphs,
   * including ones that will likely crash the vm.
   */
  large(val: LargeHandling): OptOperator;
  /** Get the current large graph handling value. */
  large(): LargeHandling;

  /** set whether to also minimize distance between nodes that share a parent / child
   *
   * This adds more variables and constraints so will take longer, but will
   * likely produce a better layout.
   */
  dist(val: boolean): OptOperator;
  /** get whether the current layout minimized distance */
  dist(): boolean;
}

/** @internal */
function buildOperator(options: {
  large: LargeHandling;
  dist: boolean;
}): OptOperator {
  // TODO optimize this for disconnected graphs by breaking them apart, solving
  // each, then mushing them back together

  function optCall(layers: DagNode[][]): void {
    // check for large input
    const numVars = layers.reduce(
      (t, l) => t + (l.length * Math.max(l.length - 1, 0)) / 2,
      0
    );
    const numEdges = layers.reduce(
      (t, l) => t + l.reduce((s, n) => s + n.ichildren().length, 0),
      0
    );
    if (options.large !== "large" && numVars > 1200) {
      throw new Error(
        `size of dag to decrossOpt is too large and will likely crash instead of complete, enable "large" grahps to run anyway`
      );
    } else if (
      options.large !== "large" &&
      options.large !== "medium" &&
      (numVars > 400 || numEdges > 100)
    ) {
      throw new Error(
        `size of dag to decrossOpt is too large and will likely not complete, enable "medium" grahps to run anyway`
      );
    }

    const distanceConstraints: [DagNode[], DagNode[][]][] = [];
    for (const [topLayer, bottomLayer] of bigrams(layers)) {
      const withParents = new Set(topLayer.flatMap((node) => node.children()));
      const topUnconstrained = bottomLayer.filter(
        (node) => !withParents.has(node)
      );
      const topGroups = topLayer
        .map((node) => node.children())
        .filter((cs) => cs.length > 1);
      distanceConstraints.push([topUnconstrained, topGroups]);

      const bottomUnconstrained = topLayer.filter((n) => !n.ichildren().length);
      const parents = new Map<DagNode, DagNode[]>();
      for (const node of topLayer) {
        for (const child of node.ichildren()) {
          const group = parents.get(child);
          if (group) {
            group.push(node);
          } else {
            parents.set(child, [node]);
          }
        }
      }
      const bottomGroups = [...parents.values()];
      distanceConstraints.push([bottomUnconstrained, bottomGroups]);
    }

    // NOTE distance cost for an unconstrained node ina group can't violate
    // all pairs at once, so cose is ~(n/2)^2 not n(n-1)/2
    const maxDistCost =
      distanceConstraints.reduce(
        (cost, [unc, gs]) =>
          gs.reduce((t, cs) => t + cs.length * cs.length, 0) * unc.length,
        0
      ) / 4;
    const distWeight = 1 / (maxDistCost + 1);
    // add small value to objective for preserving the original order of nodes
    const preserveWeight = distWeight / (numVars + 1);

    // initialize model
    const model: Model = {
      optimize: "opt",
      opType: "min",
      constraints: {},
      variables: {},
      ints: {}
    };

    // map every node to an id for quick access, if one nodes id is less than
    // another it must come before it on the layer, or in a previous layer
    const inds = new Map<DagNode, number>();
    {
      let i = 0;
      for (const layer of layers) {
        for (const node of layer) {
          inds.set(node, i++);
        }
      }
    }

    /** create a key from nodes */
    function key(...nodes: DagNode[]): string {
      return nodes
        .map((n) => def(inds.get(n)))
        .sort((a, b) => a - b)
        .join(" => ");
    }

    function perms(layer: DagNode[]): void {
      // add variables for each pair of bottom later nodes indicating if they
      // should be flipped
      for (const [i, n1] of layer.slice(0, layer.length - 1).entries()) {
        for (const n2 of layer.slice(i + 1)) {
          const pair = key(n1, n2);
          model.ints[pair] = 1;
          model.constraints[pair] = {
            max: 1
          };
          model.variables[pair] = {
            // add small value to objective for preserving the original order of nodes
            opt: -preserveWeight,
            [pair]: 1
          };
        }
      }

      // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
      // and b -> c is 1 then a -> c must also be one
      for (const [i, n1] of layer.slice(0, layer.length - 1).entries()) {
        for (const [j, n2] of layer.slice(i + 1).entries()) {
          for (const n3 of layer.slice(i + j + 2)) {
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
    }

    function cross(layer: DagNode[]): void {
      for (const [i, p1] of layer.slice(0, layer.length - 1).entries()) {
        for (const p2 of layer.slice(i + 1)) {
          const pairp = key(p1, p2);
          for (const c1 of p1.ichildren()) {
            for (const c2 of p2.ichildren()) {
              if (c1 === c2) {
                continue;
              }
              const pairc = key(c1, c2);
              const slack = `slack (${pairp}) (${pairc})`;
              const slackUp = `${slack} +`;
              const slackDown = `${slack} -`;
              model.variables[slack] = {
                opt: 1,
                [slackUp]: 1,
                [slackDown]: 1
              };

              const sign = Math.sign(def(inds.get(c1)) - def(inds.get(c2)));
              const flip = Math.max(sign, 0);

              model.constraints[slackUp] = {
                min: flip
              };
              model.variables[pairp][slackUp] = 1;
              model.variables[pairc][slackUp] = sign;

              model.constraints[slackDown] = {
                min: -flip
              };
              model.variables[pairp][slackDown] = -1;
              model.variables[pairc][slackDown] = -sign;
            }
          }
        }
      }
    }

    function distance(unconstrained: DagNode[], groups: DagNode[][]): void {
      for (const node of unconstrained) {
        for (const group of groups) {
          for (const [i, start] of group.entries()) {
            for (const end of group.slice(i + 1)) {
              // want to minimize node being between start and end
              // NOTE we don't sort because we care which is in the center
              const base = [start, node, end]
                .map((n) => def(inds.get(n)))
                .join(" => ");
              const slack = `dist ${base}`;
              const normal = `${slack} normal`;
              const reversed = `${slack} reversed`;

              model.variables[slack] = {
                opt: distWeight,
                [normal]: 1,
                [reversed]: 1
              };

              let pos = 0;
              for (const [n1, n2] of [
                [start, node],
                [start, end],
                [node, end]
              ]) {
                const pair = key(n1, n2);
                const sign = Math.sign(def(inds.get(n1)) - def(inds.get(n2)));
                pos += +(sign > 0);
                model.variables[pair][normal] = -sign;
                model.variables[pair][reversed] = sign;
              }

              model.constraints[normal] = {
                min: 1 - pos
              };
              model.constraints[reversed] = {
                min: pos - 2
              };
            }
          }
        }
      }
    }

    // add variables and permutation invariants
    for (const layer of layers) {
      perms(layer);
    }

    // add crossing minimization
    for (const layer of layers.slice(0, layers.length - 1)) {
      cross(layer);
    }

    // add distance minimization
    if (options.dist) {
      for (const [unconstrained, groups] of distanceConstraints) {
        distance(unconstrained, groups);
      }
    }

    // solve objective
    // NOTE bundling sets this to undefined, and we need it to be setable
    const ordering = Solve.call({}, model);

    // sort layers
    for (const layer of layers) {
      layer.sort(
        /* istanbul ignore next */
        (n1, n2) => ordering[key(n1, n2)] || -1
      );
    }
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

  function dist(): boolean;
  function dist(val: boolean): OptOperator;
  function dist(val?: boolean): boolean | OptOperator {
    if (val === undefined) {
      return options.dist;
    } else {
      return buildOperator({ ...options, dist: val });
    }
  }
  optCall.dist = dist;

  return optCall;
}

/** Create a default {@link OptOperator}. */
export function opt(...args: never[]): OptOperator {
  if (args.length) {
    throw new Error(
      `got arguments to opt(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ large: "small", dist: false });
}
