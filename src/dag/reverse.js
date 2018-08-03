// Reverse a dag
export default function() {
  const nodes = [];
  this.each(n => nodes.push(n));
  const newRoots = nodes.filter(n => !n.children.length);

  nodes.forEach(node => {
    [node.parents, node.children] = [node.children, node.parents];
    node._newChildLinkData = {};
    node.children.forEach(child => {
      const datum = child._childLinkData[node.id];
      if (datum) {
        node._newChildLinkData[child.id] = datum;
      }
    });
  });
  this.roots = newRoots;
  nodes.forEach(node => {
    node._childLinkData = node._newChildLinkData;
    delete node._newChildLinkData;
  });
  return this;
}
