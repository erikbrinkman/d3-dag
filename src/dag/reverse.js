// FIXME Test that reverse preserves data
export default function() {
  const newRoots = [];
  this.each(node => {
    [node.parents, node.children] = [node.children, node.parents];
    node._newChildLinkData = {};
    node.children.forEach(child => {
      const datum = child._childLinkData[node.id];
      if (datum) {
        node._newChildLinkData[child.id] = datum;
      }
    });
    if (!node.parents.length) {
      newRoots.push(node);
    }
  });
  this.roots = newRoots;
  this.each(node => {
    node._childLinkData = node._newChildLinkData;
    delete node._newChildLinkData;
  });
  return this;
}
