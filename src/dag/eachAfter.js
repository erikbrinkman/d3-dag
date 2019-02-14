// Call function on each node such that a node is called before any of its parents
export default function(func) {
  // TODO Better way to do this?
  const all = [];
  this.eachBefore((n) => all.push(n));
  all.reverse().forEach(func);
  return this;
}
