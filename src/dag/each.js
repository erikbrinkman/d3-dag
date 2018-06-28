// FIXME Decide to reverse queues based on appearance of topological sort as layout
function each(before, nodes, func) {
  // TODO Reverse queue?
  const queue = nodes.filter(n => !(n._num_ancestors = (before ? n.parents : n.children).length));
  let node;
  while (node = queue.pop()) {
    func(node);
    // TODO Reverse queue?
    (before ? node.children : node.parents).forEach(n => --n._num_ancestors || queue.push(n));
  }
  nodes.forEach(n => delete n._num_ancestors);
  return nodes;
}

export function eachBefore(nodes, func) {
  return each(true, nodes, func);
}

export function eachAfter(nodes, func) {
  return each(false, nodes, func);
}
