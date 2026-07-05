import type { GraphNode } from "../../graph/index.js";
import { type Separation, sizedSeparation } from "../utils.js";

function nodeHeight({ data }: GraphNode<string>): number {
  return (parseInt(data, 10) % 3) + 1;
}

/** default sized separation */
export const sizedSep: Separation<string, unknown> = sizedSeparation(
  nodeHeight,
  1,
);
