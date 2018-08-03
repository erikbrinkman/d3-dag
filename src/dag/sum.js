export default function(func) {
  this.eachAfter(node => {
    const val = +func(node.data);
    node._descendants = Object.assign({[node.id]: val}, ...node.children.map(c => c._descendants));
    node.value = Object.values(node._descendants).reduce((a, b) => a + b);
  });
  this.each(n => delete n._descendants);
  return this;
}
