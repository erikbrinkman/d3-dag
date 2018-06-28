export default function(nodes) {
  // Pass through empty
  if (!nodes.length) return "";

  // Identify roots
  const roots = nodes.filter(n => !n.parents.length),
    seen = {},
    past = {};
  if (!roots.length) return "dag contained no roots";

  // Test that dag is connected
  const explored = {},
    queue = nodes.slice(0, 1);
  let node;
  while (node = queue.pop()) {
    if (!explored[node.id]) {
      explored[node.id] = true;
      node.children.forEach(n => queue.push(n));
      node.parents.forEach(n => queue.push(n));
    }
  }
  if (Object.keys(explored).length !== nodes.length) return "dag was not connected";

  // Test that dag is free of cycles
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
  return msg ? "dag contained a cycle: " + msg.reverse().join(" -> ") : "";
}
