export default function() {
  this.eachAfter(node => {
    if (node.children.length) {
      node._leaves = Object.assign({}, ...node.children.map(c => c._leaves));
      node.value = Object.keys(node._leaves).length;
    } else {
      node._leaves = {[node.id]: true};
      node.value = 1;
    }
  });
  this.nodes().forEach(n => delete n._leaves);
  return this;
}
