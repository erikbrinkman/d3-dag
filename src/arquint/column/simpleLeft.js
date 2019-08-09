export default function() {
    // trivial column assignment (based on node's index in its layer => fill up columns from left to right)
  function columnIndexAssignmentLeftToRight(layers) {
    layers.forEach((layer) => {
      layer.forEach((node, nodeIndex) => (node.columnIndex = nodeIndex));
    });
  }

  return columnIndexAssignmentLeftToRight;
}
