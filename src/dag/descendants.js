export default function() {
  const descs = [];
  this.eachDepth(n => descs.push(n));
  return descs;
}
