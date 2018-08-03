// FIXME Check all of these are thrown
// Verify that a dag meets all criteria for validity
export default function(roots) {
  // Verify dag is nonempty
  if (!roots.length) throw new Error("dag contained no roots");

  // Check that roots are roots
  if (roots.some(n => n.parents.length)) throw new Error("a root had a parent");

  // Test that dag is connected
  const explored = {};
  const root_ids = roots.reduce((r, n) => { r[n.id] = true; return r; }, {});
  const queue = roots.slice(0, 1);
  let node;
  while (node = queue.pop()) {
    if (!explored[node.id]) {
      if (!node.parents.length && !root_ids[node.id]) throw new Error("dag contained other roots");
      if (node.id.indexOf("\0") >= 0) throw new Error("node id contained null character");
      if (!node.data) throw new Error("node contained falsy data");
      explored[node.id] = true;
      queue.push(...node.children, ...node.parents);
    }
  }
  if (roots.some(r => !explored[r.id])) throw new Error("dag was not connected");

  // Test that dag is free of cycles
  const seen = {};
  const past = {};
  let rec = undefined;
  function visit(node) {
    if (seen[node.id]) {
      return false;
    } else if (past[node.id]) {
      rec = node.id;
      return [node.id];
    } else {
      past[node.id] = true;
      let result = node.children.reduce((chain, c) => chain || visit(c), false);
      delete past[node.id];
      seen[node.id] = true;
      if (result && rec) result.push(node.id);
      if (rec === node.id) rec = undefined;
      return result;
    }
  }
  const msg = roots.reduce((msg, r) => msg || visit(r), false);
  if (msg) throw new Error("dag contained a cycle: " + msg.reverse().join(" -> "));
}
