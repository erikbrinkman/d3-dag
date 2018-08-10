// Assign a value for the layer of each node that minimizes the length of the longest path
export default function(dag) {
  const maxHeight = dag.height().roots().map(d => d.value).reduce((m, h) => Math.max(m, h));
  dag.each(n => n.layer = maxHeight - n.value);
  return dag;
}
