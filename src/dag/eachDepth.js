// FIXME Add integers to function for eaches
// FIXME Do something about guarantees for queuing children vs calling function, seems like function should be called first
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
