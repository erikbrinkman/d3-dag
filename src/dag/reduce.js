// Reduce over nodes
export default function(func, start) {
  let accum = start;
  this.each((n, i) => {
    accum = func(accum, n, i);
  });
  return accum;
}
