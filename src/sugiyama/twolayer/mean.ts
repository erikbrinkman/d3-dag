/**
 * The mean order operator orders the bottom layer according to the mean of
 * their parent's indices.
 *
 * @module
 */
import { SugiNode } from "../utils";
import { TwolayerOperator } from ".";
import { def } from "../../utils";
import { order } from "./utils";

export type MeanOperator = TwolayerOperator<unknown, unknown>;

/** @internal */
class Mean {
  mean: number = 0.0;
  count: number = 0;

  constructor(vals: Iterable<number> = []) {
    for (const val of vals) {
      this.add(val);
    }
  }

  add(val: number): void {
    this.mean += (val - this.mean) / ++this.count;
  }

  get_mean(): number | undefined {
    return this.count ? this.mean : undefined;
  }
}

/** Create a mean two layer ordering operator. */
export function mean(...args: never[]): MeanOperator {
  if (args.length) {
    throw new Error(
      `got arguments to mean(${args}), but constructor takes no aruguments.`
    );
  }

  function meanCall(
    topLayer: SugiNode[],
    bottomLayer: SugiNode[],
    topDown: boolean
  ): void {
    if (topDown) {
      const incr = new Map(
        bottomLayer.map((node) => [node, new Mean()] as const)
      );
      for (const [i, node] of topLayer.entries()) {
        for (const child of node.ichildren()) {
          def(incr.get(child)).add(i);
        }
      }
      const means = new Map(
        [...incr.entries()].map(
          ([node, mean]) => [node, mean.get_mean()] as const
        )
      );
      order(bottomLayer, means);
    } else {
      const inds = new Map(bottomLayer.map((node, i) => [node, i] as const));
      const means = new Map(
        topLayer.map((node) => {
          const mean = new Mean(
            node.ichildren().map((child) => def(inds.get(child)))
          ).get_mean();
          return [node, mean] as const;
        })
      );
      order(topLayer, means);
    }
  }

  return meanCall;
}
