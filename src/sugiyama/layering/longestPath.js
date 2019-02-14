// Assign a value for the layer of each node that minimizes the length of the longest path
export default function() {
  let topDown = true;

  function layeringLongestPath(dag) {
    if (topDown) {
      const maxHeight = Math.max(
        ...dag
          .height()
          .roots()
          .map((d) => d.value),
      );
      dag.each((n) => {
        n.layer = maxHeight - n.value;
      });
    } else {
      dag.depth();
      dag.each((n) => {
        n.layer = n.value;
      });
    }
    return dag;
  }

  layeringLongestPath.topDown = function(x) {
    return arguments.length ? ((topDown = x), layeringLongestPath) : topDown;
  };

  return layeringLongestPath;
}
