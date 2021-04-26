/**
 * This wraps the logic to verify DAGs are valid, and is shared by the three
 * construction methods.
 *
 * @module
 */
import { DagNode, LayoutDagRoot } from "./node";

import { getCircularReplacer } from "../utils";

/** @internal Verify an ID is a valid ID. */
export function verifyId(id: string): string {
  if (typeof id !== "string") {
    throw new Error(`id is supposed to be string but got type ${typeof id}`);
  }
  return id;
}

/** @internal Verify a DAG is valid. */
export function verifyDag<NodeType extends DagNode>(roots: NodeType[]): void {
  // test that there are roots
  if (!roots.length) throw new Error("dag contained no roots");

  // test that dag is free of cycles
  // we attempt to take every unique path from each root and see if we ever see
  // a node again
  const seen = new Set<NodeType>(); // already processed
  const past = new Set<NodeType>(); // seen down this path
  let rec: NodeType | null = null;

  /** visit nodes returning cycle if found */
  function visit(node: NodeType): NodeType[] {
    if (seen.has(node)) {
      return [];
    } else if (past.has(node)) {
      rec = node;
      return [node];
    } else {
      past.add(node);
      let result: NodeType[] = [];
      for (const child of node.ichildren()) {
        result = visit(child);
        if (result.length) break;
      }
      past.delete(node);
      seen.add(node);
      if (result.length && rec !== null) result.push(node);
      if (rec === node) rec = null;
      return result;
    }
  }

  for (const root of roots) {
    const msg = visit(root);
    if (msg.length) {
      throw new Error(
        "dag contained a cycle: " +
          msg
            .reverse()
            .map(
              ({ data }) => `'${JSON.stringify(data, getCircularReplacer())}'`
            )
            .join(" -> ")
      );
    }
  }

  // make sure there's no duplicate edges
  for (const node of new LayoutDagRoot(roots)) {
    const childIdSet = new Set(node.ichildren());
    if (childIdSet.size !== node.dataChildren.length) {
      throw new Error(`node '${node.data}' contained duplicate children`);
    }
  }
}
