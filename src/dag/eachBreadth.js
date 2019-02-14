// Call nodes in bread first order
// No guarantees are made on whether the function is called first, or children
// are queued. This is important if the function modifies a node's children.
export default function(func) {
  const seen = {};
  let current = [];
  let next = this.roots();
  let i = 0;
  do {
    current = next.reverse();
    next = [];
    let node;
    while ((node = current.pop())) {
      if (!seen[node.id]) {
        seen[node.id] = true;
        func(node, i++);
        next.push(...node.children);
      }
    }
  } while (next.length);
}
