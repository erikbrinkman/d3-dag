export default function(dag) {
  const maxHeight = dag.height().roots.reduce((m, n) => Math.max(m, n.height), 0);
  dag.each(n => n.layer = maxHeight - n.height);
}
