export default function() {
  return this.eachBefore(n => n.depth = Math.max(0, ...n.parents.map(c => 1 + c.depth)));
}
