export default function(nodes) {
  nodes.forEach(node => [node.parents, node.children] = [node.children, node.parents]);
  return nodes;
}
