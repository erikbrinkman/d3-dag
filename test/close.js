module.exports = function(a, b, atol=1e-13, rtol=1e-7) {
  const close = Math.abs(a - b) <= atol + rtol * Math.abs(b);
  if (!close) {
    console.error(`${a} is not close to ${b}`);
  }
  return close;
}
