import { GraphNode } from "../../graph";
import { Separation, sizedSeparation } from "../utils";

function nodeHeight({ data }: GraphNode<string>): number {
  return (parseInt(data) % 3) + 1;
}

/** default sized separation */
export const sizedSep: Separation<string, unknown> = sizedSeparation(
  nodeHeight,
  1,
);
