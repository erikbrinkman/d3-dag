// Assign a value for the layer of each node that is a topological ordering
export default function() {
  
  // TODO Add option to optimally assign layer to minimize number of dummy nodes, similar to simplex

  function layeringTopological(dag) {
    let layer = 0;
    dag.eachBefore(n => n.layer = layer++);
    return dag;
  }

  return layeringTopological;
}
