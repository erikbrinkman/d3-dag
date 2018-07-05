export default function() {
  this.nodes().forEach(node => [node.parents, node.children] = [node.children, node.parents]);
  if (this._links) {
    this._links.forEach(link => [link.source, link.target] = [link.target, link.source]);
  }
  return this;
}
