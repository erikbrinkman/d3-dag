/**
 * This accessor positions nodes to minimize the curvature of every line, and
 * the distance between every edge.  This accessor solves a quadratic program
 * (QP) and so may take significant time, especially as the number of nodes
 * grows.
 *
 * <img alt="min curve example" src="media://min_curve.png" width="400">
 *
 * @packageDocumentation
 */
import { HorizableNode, Operator, Separation } from ".";
import { indices, init, layout, minBend, minDist, solve } from "./utils";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export interface MinCurveOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /**
   * Set the weight that trades off between distance and curvature. Weight must
   * be a value between 0 includive and 1 exclusive. Higher weights prioritize
   * minimizing curves more, while lower weights prioritize minimizing child
   * closeness. Since minimizing only curves is not well defined, weight can
   * not be 1.
   */
  weight(val: number): MinCurveOperator<NodeType>;
  /** Get the current weight, which defaults to 1/2. */
  weight(): number;
}

/** @internal */
function buildOperator<NodeType extends DagNode>(
  weightVal: number
): MinCurveOperator<NodeType> {
  function minCurveCall(
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
          minDist(Q, pind, nind, 1 - weightVal);
          for (const child of node.ichildren()) {
            const cind = inds.getThrow(child.id);
            minBend(Q, pind, nind, cind, weightVal);
          }
        }
      }
    }

    const solution = solve(Q, c, A, b);
    layout(layers, inds, solution);
  }

  function weight(): number;
  function weight(val: number): MinCurveOperator<NodeType>;
  function weight(val?: number): number | MinCurveOperator<NodeType> {
    if (val === undefined) {
      return weightVal;
    } else if (val < 0 || val >= 1) {
      throw new Error(`weight must be in [0, 1), but was ${weightVal}`);
    } else {
      return buildOperator(val);
    }
  }
  minCurveCall.weight = weight;

  return minCurveCall;
}

/** Create a default [[MinCurveOperator]]. */
export function minCurve<NodeType extends DagNode>(
  ...args: never[]
): MinCurveOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to minCurve(${args}), but constructor takes no aruguments.`
    );
  }

  return buildOperator(0.5);
}
