// Set each node's value to be zero for leaf nodes and the greatest distance to
// any leaf node for other nodes
export default function() {
  this.each(n => n.children.forEach(c => (c._parents || (c._parents = [])).push(n)));
  this.eachBefore(n => n.value = Math.max(0, ...(n._parents || []).map(c => 1 + c.value)));
  this.each(n => delete n._parents);
  return this;
}
