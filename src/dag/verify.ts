/**
 * This wraps the logic to verify DAGs are valid, and is shared by the three
 * construction methods.
 *
 * @module
 */
import { DagNode, LayoutDagRoot } from "./node";

import { js } from "../utils";

/** @internal Verify an ID is a valid ID. */
export function verifyId(id: string): string {
  if (typeof id !== "string") {
    throw new Error(`id is supposed to be string but got type ${typeof id}`);
  }
  return id;
}

/** @internal Verify a DAG is valid. */
export function verifyDag(roots: DagNode[]): void {
  // test that there are roots
  if (!roots.length)
    throw new Error("dag contained no roots; this often indicates a cycle");

  // make sure there's no duplicate edges
  for (const node of new LayoutDagRoot(roots)) {
    const childIdSet = new Set(node.ichildren());
    if (childIdSet.size !== node.dataChildren.length) {
      throw new Error(js`node '${node.data}' contained duplicate children`);
    }
  }

  // test that dag is free of cycles
  // we attempt to take every unique path from each root and see if we ever see
  // a node again
  const seen = new Set<DagNode>(); // already processed
  const past = new Set<DagNode>(); // seen down this path
  let rec: DagNode | null = null;

  /** visit nodes returning cycle if found */
  function visit(node: DagNode): DagNode[] {
    if (seen.has(node)) {
      return [];
    } else if (past.has(node)) {
      rec = node;
      return [node];
    } else {
      past.add(node);
      let result: DagNode[] = [];
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
      const cycle = msg
        .reverse()
        .map(({ data }) => js`'${data}'`)
        .join(" -> ");
      throw new Error(`dag contained a cycle: ${cycle}`);
    }
  }
}
