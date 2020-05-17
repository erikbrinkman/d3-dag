/**
 * This wraps the logic to verify DAGs are valid, and is shared by the three
 * construction methods.
 *
 * @packageDocumentation
 */
import { DagNode, LayoutDagRoot } from "./node";

/** @internal Verify an ID is a valid ID. */
export function verifyId(id: string): string {
  if (typeof id !== "string") {
    throw new Error(`id is supposed to be string but got type ${typeof id}`);
  } else if (id.indexOf("\0") >= 0) {
    throw new Error(`node id ${id} contained null character`);
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
  const seen = new Set<string>(); // already processed
  const past = new Set<string>(); // seen down this path
  let rec: string | null = null;

  function visit(node: NodeType): string[] {
    if (seen.has(node.id)) {
      return [];
    } else if (past.has(node.id)) {
      rec = node.id;
      return [node.id];
    } else {
      past.add(node.id);
      let result: string[] = [];
      for (const child of node.ichildren()) {
        result = visit(child);
        if (result.length) break;
      }
      past.delete(node.id);
      seen.add(node.id);
      if (result.length && rec !== null) result.push(node.id);
      if (rec === node.id) rec = null;
      return result;
    }
  }

  for (const root of roots) {
    const msg = visit(root);
    if (msg.length) {
      throw new Error("dag contained a cycle: " + msg.reverse().join(" -> "));
    }
  }

  // make sure there's no duplicate edges
  for (const node of new LayoutDagRoot(roots)) {
    const childIdSet = new Set(node.ichildren().map((n) => n.id));
    if (childIdSet.size !== node.dataChildren.length) {
      throw new Error(`node '${node.id}' contained duplicate children`);
    }
  }
}
