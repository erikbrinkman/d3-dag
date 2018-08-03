// Set each node's value to zero for root nodes and the greatest distance to
// any root for other nodes
export default function() {
  return this.eachAfter(n => n.value = Math.max(0, ...n.children.map(c => 1 + c.value)));
}
