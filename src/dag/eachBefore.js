// Call a function on each node such that a node is called before any of its children
export default function(func) {
  // Cache this to save time on iteration
  const all = [];
  const seen = {};
  this.each(node => {
    seen[node.id] = true;
    all.push(node);
  });

  const queue = [];
  all.forEach(n => n._num_before = n.parents.reduce((t, p) => t + seen[p.id], 0) || queue.push(n));

  let node;
  let i = 0;
  while (node = queue.pop()) {
    func(node, i++);
    node.children.forEach(n => --n._num_before || queue.push(n));
  }

  all.forEach(n => delete n._num_before);
  return this;
}
