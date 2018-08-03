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
  while (node = queue.pop()) {
    func(node);
    node.children.forEach(n => --n._num_before || queue.push(n));
  }

  all.forEach(n => delete n._num_before);
  return this;
}
