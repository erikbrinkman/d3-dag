export default function(func) {
  const all = [];
  this.eachBefore(n => all.push(n));
  all.reverse().forEach(func);
  return this;
}
