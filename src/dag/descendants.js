export default function() {
  const descs = [];
  this.each(n => descs.push(n));
  return descs;
}
