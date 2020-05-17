/**
 * This accessor positions nodes so that the distance between nodes and the
 * their neightbors is minimized, while the curve through dummy nodes is also
 * minimized. This has the effect of trying to make edges as straight and
 * vertical as possible. This accessor solves a quadratic program (QP) and so
 * may take significant time, especially as the number of nodes grows.
 *
 * <img alt="vert example" src="media://simplex.png" width="400">
 *
 * @packageDocumentation
 */

// TODO Add parameter that trades off between curve and dist

import { HorizableNode, Operator, Separation } from ".";
import { indices, init, layout, minBend, minDist, solve } from "./utils";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export type VertOperator<NodeType extends DagNode> = Operator<NodeType>;

/** Create a vertical coordinate assignment operator. */
export function vert<NodeType extends DagNode>(
  ...args: never[]
): VertOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to vert(${args}), but constructor takes no aruguments.`
    );
  }

  const weight = 0.5;

  function vertCall(
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    separation: Separation<NodeType>
  ): void {
    const inds = indices(layers);
    const [Q, c, A, b] = init(layers, inds, separation);

    for (const layer of layers) {
      for (const par of layer) {
        const pind = inds.getThrow(par.id);
        for (const node of par.ichildren()) {
          const nind = inds.getThrow(node.id);
          if (!(par instanceof DummyNode)) {
            minDist(Q, pind, nind, 1 - weight);
          }
          if (!(node instanceof DummyNode)) {
            minDist(Q, pind, nind, 1 - weight);
          } else {
            for (const child of node.ichildren()) {
              const cind = inds.getThrow(child.id);
              minBend(Q, pind, nind, cind, weight);
            }
          }
        }
      }
    }

    const solution = solve(Q, c, A, b);
    layout(layers, inds, solution);
  }

  return vertCall;
}
