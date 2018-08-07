// Assign layer to each node that constrains width
export default function(dag) {
  const maxWidth = Math.floor(Math.sqrt(dag.nodes().length) + 0.5);
  dag.each(n => n._before = []);
  const queue = dag.roots.slice();
  let i = 0;
  let layer = 0;
  let width = 0;
  let node;
  while (node = queue.pop()) {
    if (width < maxWidth && node.parents.every(p => p.layer < layer)) {
      node.layer = layer;
      width++;
    } else {
      node.layer = ++layer;
      width = 0;
    }
    node.children.forEach(child => {
      child._before.push(i);
      if (child._before.length === child.parents.length) {
        child._before.sort((a, b) => b - a);
        queue.push(child);
      }
    });
    // FIXME Instead of sorting after every set of additions, queue should just
    // be a priority queue, or at the very least, should use in order insertion
    // with d3's bisect.
    queue.sort((a, b) => {
      for (let j = 0; j < a._before.length; ++j) {
        if (j >= b._before.length) {
          return -1;
        } else if (a._before[j] < b._before[j]) {
          return 1;
        } else if (b._before[j] < a._before[j]) {
          return -1;
        }
      }
      return 1;
    });
    i++;
  }
  dag.each(n => delete n._before);
}
