// Return true if the dag is connected
export default function connected() {
  if (this.id !== undefined) {
    return true;
  }

  const rootsSpan = this.roots().map((r) => r.descendants().map((n) => n.id));
  const reached = rootsSpan.map(() => false);
  const queue = [0];
  while (queue.length) {
    const i = queue.pop();
    if (reached[i]) {
      continue; // already explored
    }
    const spanMap = {};
    reached[i] = true;
    rootsSpan[i].forEach((n) => (spanMap[n] = true));
    rootsSpan
      .slice(i + 1)
      .reverse()
      .forEach((span, j) => {
        if (span.some((n) => spanMap[n])) {
          queue.push(rootsSpan.length - j - 1);
        }
      });
  }
  return reached.every((b) => b);
}
