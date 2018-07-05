// FIXME Split up these definitions
function relatives(ancestors, node) {
  const queue = [node],
    relatives = [],
    seen = {};
  while (node = queue.pop()) {
    if (!seen[node.id]) {
      seen[node.id] = true;
      relatives.push(node);
      (ancestors ? node.parents : node.children).forEach(r => queue.push(r));
    }
  }
  return relatives;
}

export function ancestors() {
  return relatives(true, this);
}

export function descendants() {
  return relatives(false, this);
}
