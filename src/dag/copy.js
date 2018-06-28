import {Node} from "./node";

export default function(nodes) {
  const cnodes = nodes.map(n => new Node(n.id, n.data));
  const mapping = cnodes.reduce((m, n) => { m[n.id] = n; return m; }, {});
  cnodes.forEach((cnode, i) => {
    const node = nodes[i];
    cnode.children = node.children.map(c => mapping[c.id]);
    cnode.parents = node.parents.map(p => mapping[p.id]);
  });
  return cnodes;
}
