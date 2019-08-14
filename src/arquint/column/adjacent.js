export default function() {
  let center = false;

  function columnIndexAssignmentAdjacent(layers) {
    // assigns column indices to the layer with most nodes first.
    // afterwards starting from the layer with most nodes, column indices are assigned
    // to nodes in adjacent layers. Column indices are assigned with respect to the
    // node's parents or children while maintaining the same ordering in the layer.
    // overlapping nodes can occur because nodes can be placed in the same column
    // although they do not have a children/parents relation with each other
    if (layers.length == 0) {
      return;
    }

    // find layer index with most entries:
    const maxNodesCount = Math.max(...layers.map((layer) => layer.length));
    const maxNodesLayerIndex = layers.findIndex(
      (layer) => layer.length === maxNodesCount
    );

    // layer with most nodes simply assign columnIndex to the node's index:
    layers[maxNodesLayerIndex].forEach(
      (node, index) => (node.columnIndex = index)
    );

    // layer with most nodes stays unchanged
    // first, visit each layer above the layer with most nodes
    for (let i = maxNodesLayerIndex - 1; i >= 0; i--) {
      fillLayerBackwards(layers[i]);
    }

    // then, visit each layer below the layer with most nodes
    for (let i = maxNodesLayerIndex + 1; i < layers.length; i++) {
      fillLayerForward(layers[i]);
    }

    function fillLayerBackwards(layer) {
      let actualColumnIndices;
      if (layer.length === maxNodesCount) {
        // leave layer unchanged
        actualColumnIndices = layer.map((_, index) => index);
      } else {
        // map each node to its desired location:
        const desiredColumnIndices = layer.map((node, index) => {
          if (node.children == null || node.children.length === 0) {
            return index;
          }
          const childrenColumnIndices = node.children.map(
            (child) => child.columnIndex
          );
          if (center) {
            // return column index of middle child
            return childrenColumnIndices[
              Math.floor((childrenColumnIndices.length - 1) / 2)
            ];
          } else {
            return childrenColumnIndices[0];
          }
        });
        // based on the desired column index, the actual column index needs to be assigned
        // however, the column indices have to be strictly monotonically increasing and have to
        // be greater or equal 0 and smaller than maxNodesCount!
        actualColumnIndices = optimizeColumnIndices(desiredColumnIndices);
      }

      // assign now the column indices to the nodes:
      layer.forEach(
        (node, index) => (node.columnIndex = actualColumnIndices[index])
      );
    }

    function fillLayerForward(layer) {
      let actualColumnIndices;
      if (layer.length === maxNodesCount) {
        // leave layer unchanged
        actualColumnIndices = layer.map((_, index) => index);
      } else {
        // map each node to its desired location:
        const desiredColumnIndices = layer.map((node, index) => {
          if (node.parents == null || node.parents.length === 0) {
            return index;
          }
          const parentColumnIndices = node.parents.map(
            (parent) => parent.columnIndex
          );
          if (center) {
            // return column index of middle parent
            return parentColumnIndices[
              Math.floor((parentColumnIndices.length - 1) / 2)
            ];
          } else {
            return parentColumnIndices[0];
          }
        });
        // based on the desired column index, the actual column index needs to be assigned
        // however, the column indices have to be strictly monotonically increasing and have to
        // be greater or equal 0 and smaller than maxNodesCount!
        actualColumnIndices = optimizeColumnIndices(desiredColumnIndices);
      }

      // assign now the column indices to the nodes:
      layer.forEach(
        (node, index) => (node.columnIndex = actualColumnIndices[index])
      );
    }

    function optimizeColumnIndices(desiredColumnIndices) {
      if (!desiredColumnIndices.every((columnIndex) => isFinite(columnIndex))) {
        throw `columnComplex: non-finite column index encountered`;
      }

      // step 1: reorder indices such that they are strictly monotonically increasing
      let largestIndex = -1;
      desiredColumnIndices = desiredColumnIndices.map((columnIndex) => {
        if (columnIndex <= largestIndex) {
          columnIndex = largestIndex + 1;
        }
        largestIndex = columnIndex;
        return columnIndex;
      });

      // step 2: shift indices such that they are larger or equal 0 and smaller than maxNodesCount
      const max = Math.max(...desiredColumnIndices);
      const downShift = max - (maxNodesCount - 1);
      if (downShift > 0) {
        // nodes need to be shifted by that amount
        desiredColumnIndices = desiredColumnIndices.map((columnIndex, index) =>
          Math.max(columnIndex - downShift, index)
        );
      }

      return desiredColumnIndices;
    }
  }

  columnIndexAssignmentAdjacent.center = function(x) {
    return arguments.length
      ? ((center = x), columnIndexAssignmentAdjacent)
      : center;
  };

  return columnIndexAssignmentAdjacent;
}
