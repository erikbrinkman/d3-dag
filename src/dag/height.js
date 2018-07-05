export default function() {
  return this.eachAfter(n => n.height = Math.max(0, ...n.children.map(c => 1 + c.height)));
}
