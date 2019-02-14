// Return an array of all descendants
export default function() {
  const descs = [];
  this.each((n) => descs.push(n));
  return descs;
}
