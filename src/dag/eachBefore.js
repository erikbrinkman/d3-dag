// Call a function on each node such that a node is called before any of its children
export default function(func) {
  this.each(n => n._num_before = 0);
  this.each(n => n.children.forEach(c => ++c._num_before));

  const queue = this.roots();
  let node;
  let i = 0;
  while (node = queue.pop()) {
    func(node, i++);
    node.children.forEach(n => --n._num_before || queue.push(n));
  }

  this.each(n => delete n._num_before);
  return this;
}
