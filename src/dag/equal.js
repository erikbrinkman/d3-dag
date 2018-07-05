function equal(a, b) {
  return Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(k => a[k] === b[k]);
}

export default function(that) {
  if (this.nodes().length !== that.nodes().length) return false;
  const info = {};
  this.nodes().forEach(node => {
    info[node.id] = [
      node.data,
      node.parents.reduce((m, p) => { m[p.id] = true; return m; }, {}),
      node.children.reduce((m, c) => { m[c.id] = true; return m; }, {})];
  });
  return that.nodes().every(node => {
    const [ddat, dparent, dchild] = info[node.id],
      parents = node.parents.reduce((m, p) => { m[p.id] = true; return m; }, {}),
      children = node.children.reduce((m, c) => { m[c.id] = true; return m; }, {});
    return node.data === ddat && equal(parents, dparent) && equal(children, dchild);
  });
}
