// FIXME Decide to reverse queues based on appearance of topological sort as layout
function each(before, dag, func) {
  // TODO Reverse queue?
  const queue = dag.nodes().filter(n => !(n._num_ancestors = (before ? n.parents : n.children).length));
  let node;
  while (node = queue.pop()) {
    func(node);
    // TODO Reverse queue?
    (before ? node.children : node.parents).forEach(n => --n._num_ancestors || queue.push(n));
  }
  dag.nodes().forEach(n => delete n._num_ancestors);
  return dag;
}

export function eachBefore(func) {
  return each(true, this, func);
}

export function eachAfter(func) {
  return each(false, this, func);
}
