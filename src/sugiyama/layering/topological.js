// Assign a value for the layer of each node that is a topological ordering
export default function() {
  
  function layeringTopological(dag) {
    let layer = 0;
    dag.eachBefore(n => n.layer = layer++);
    return dag;
  }

  return layeringTopological;
}
