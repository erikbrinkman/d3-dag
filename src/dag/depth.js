// Set each node's value to be zero for leaf nodes and the greatest distance to
// any leaf node for other nodes
export default function() {
  const valid = {};
  this.each(n => valid[n.id] = true);
  return this.eachBefore(n => n.value = Math.max(0, ...n.parents.filter(p => valid[p.id]).map(c => 1 + c.value)));
}
