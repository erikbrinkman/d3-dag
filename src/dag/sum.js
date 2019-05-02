// Call a function on each nodes data and set its value to the sum of the function return and the return value of all descendants
export default function(func) {
  this.eachAfter((node, i) => {
    const val = +func(node.data, i);
    node._descendants = Object.assign(
      { [node.id]: val },
      ...node.children.map((c) => c._descendants)
    );
    node.value = Object.values(node._descendants).reduce((a, b) => a + b);
  });
  this.each((n) => delete n._descendants);
  return this;
}
