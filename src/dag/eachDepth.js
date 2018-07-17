export default function(nodes, func) {
  const queue = nodes.slice();
  const seen = {};
  let node;
  while (node = queue.pop()) {
    if (!seen[node.id]) {
      seen[node.id] = true;
      queue.push(...node.children);
      func(node);
    }
  }
}
