export default function() {
    // keeps order of nodes in a layer but spreads nodes in a layer over the middle columns
    function columnIndexAssignmentCenter(layers) {
        const maxNodesPerLayer = Math.max(...layers.map((layer) => layer.length));
        layers.forEach((layer) => {
          const nodesInLayer = layer.length;
          const startColumnIndex = Math.floor(
            (maxNodesPerLayer - nodesInLayer) / 2
          );
          layer.forEach(
            (node, nodeIndex) => (node.columnIndex = startColumnIndex + nodeIndex)
          );
        });
      }

    return columnIndexAssignmentCenter;
}
