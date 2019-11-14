// Verify that a dag meets all criteria for validity
// Note, this is written such that root must be a dummy node, i.e. have an undefined id
export default function(root) {
  // Test that dummy criteria is met
  if (root.id !== undefined) throw new Error("invalid format for verification");

  // Test that there are roots
  if (!root.children.length) throw new Error("no roots");

  // Test that dag is free of cycles
  const seen = {};
  const past = {};
  let rec = undefined;
  function visit(node) {
    if (seen[node.id]) {
      return false;
    } else if (past[node.id]) {
      rec = node.id;
      return [node.id];
    } else {
      past[node.id] = true;
      let result = node.children.reduce((chain, c) => chain || visit(c), false);
      delete past[node.id];
      seen[node.id] = true;
      if (result && rec) result.push(node.id);
      if (rec === node.id) rec = undefined;
      return result;
    }
  }
  const msg =
    root.id === undefined
      ? root.children.reduce((msg, r) => msg || visit(r), false)
      : visit(root);
  if (msg)
    throw new Error("dag contained a cycle: " + msg.reverse().join(" -> "));

  // Test that all nodes are valid
  root.each((node) => {
    if (node.id.indexOf("\0") >= 0)
      throw new Error("node id contained null character");
    if (!node.data) throw new Error("node contained falsy data");
  });

  // Test that dag is connected
  const rootsSpan = root.children.map((r) => r.descendants().map((n) => n.id));
  const connected =
    root.children.length === 1 ||
    rootsSpan.every((rootSpan, i) => {
      const otherSpan = {};
      rootsSpan
        .slice(0, i)
        .concat(rootsSpan.slice(i + 1))
        .forEach((span) => span.forEach((n) => (otherSpan[n] = true)));
      return rootSpan.some((n) => otherSpan[n]);
    });
  if (!connected) {
    // eslint-disable-next-line no-console
    console.warn("dag was not connected");
  }

  // Test that all link data is valid
  if (root.links().some(({ data }) => !data))
    throw new Error("dag had falsy link data");
}
