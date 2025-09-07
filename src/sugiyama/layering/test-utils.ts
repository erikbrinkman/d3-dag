import type { GraphNode } from "../../graph";
import { type Separation, sizedSeparation } from "../utils";

function nodeHeight({ data }: GraphNode<string>): number {
  return (parseInt(data, 10) % 3) + 1;
}

/** default sized separation */
export const sizedSep: Separation<string, unknown> = sizedSeparation(
  nodeHeight,
  1,
);
