export default function() {
  const queue = [this];
  const ancests = [];
  const seen = {};
  let node;
  while (node = queue.pop()) {
    if (!seen[node.id]) {
      seen[node.id] = true;
      ancests.push(node);
      node.parents.forEach(r => queue.push(r));
    }
  }
  return ancests;
}
