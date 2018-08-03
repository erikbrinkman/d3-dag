// Call a function on each node in an arbitrary order
// No guarantees are made with respect to whether the function is called first
// or the children are queued. This is important if the function modifies the
// children of a node.
export default function(nodes, func) {
  const queue = nodes.slice();
  const seen = {};
  let node;
  let i = 0;
  while (node = queue.pop()) {
    if (!seen[node.id]) {
      seen[node.id] = true;
      func(node, i++);
      queue.push(...node.children);
    }
  }
}
