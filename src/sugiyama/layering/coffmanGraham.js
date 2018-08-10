// Assign layer to each node that constrains width
// TODO switch to d3 priority queue when it exists
import FastPriorityQueue from 'fastpriorityqueue';

// TODO Coffman graham that has parametrized width
export default function(dag) {
  const maxWidth = Math.floor(Math.sqrt(dag.reduce(a => a + 1, 0)) + 0.5);

  // Initialize node data
  dag.each(node => {
    node._before = [];
    node._parents = [];
  }).each(n => n.children.forEach(c => c._parents.push(n)));

  // Create queue
  const queue = FastPriorityQueue((a, b) => {
    for (let j = 0; j < a._before.length; ++j) {
      if (j >= b._before.length) {
        return false;
      } else if (a._before[j] < b._before[j]) {
        return true;
      } else if (b._before[j] < a._before[j]) {
        return false;
      }
    }
    return true;
  });
  
  // Start with root nodes
  dag.roots().forEach(n => queue.add(n));
  let i = 0;
  let layer = 0;
  let width = 0;
  let node;
  while (node = queue.poll()) {
    if (width < maxWidth && node._parents.every(p => p.layer < layer)) {
      node.layer = layer;
      width++;
    } else {
      node.layer = ++layer;
      width = 0;
    }
    node.children.forEach(child => {
      child._before.push(i);
      if (child._before.length === child._parents.length) {
        child._before.sort((a, b) => b - a);
        queue.add(child);
      }
    });
    i++;
  }

  // Remove bookkeeping
  dag.each(node => {
    delete node._before;
    delete node._parents;
  });
  return dag;
}
