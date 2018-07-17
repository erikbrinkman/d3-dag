export default function(nodes, func) {
  const seen = {};
  let current = [];
  let next = nodes.slice();
  do {
    current = next.reverse();
    next = [];
    let node;
    while (node = current.pop()) {
      if (!seen[node.id]) {
        seen[node.id] = true;
        next.push(...node.children);
        func(node);
      }
    }
  } while (next.length);
}
