// Assign a value for the layer of each node that minimizes the length of the longest path
export default function(dag) {
  const maxHeight = dag.height().roots.reduce((m, n) => Math.max(m, n.value), 0);
  dag.each(n => n.layer = maxHeight - n.value);
}
