// Assign a value to each node such that the nodes are topologically ordered
export default function(dag) {
  let index = 0;
  return dag.eachBefore(n => n.value = index++);
}
