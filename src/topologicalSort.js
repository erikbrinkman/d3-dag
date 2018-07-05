export default function topologicalSort(dag) {
  let index = 0;
  return dag.eachBefore(n => n.value = index++);
}
