// Compute x0 and x1 coordinates for nodes that maximizes the spread of nodes in [0, 1].
// It uses columnIndex that has to be present in each node.
// due to the varying height of the nodes, nodes from different layers might be present at the same y coordinate
// therefore, nodes should not be centered in their layer but centering should be considered over all layers
//
export default function() {
  function coordSpread(layers, columnWidthFunction, columnSeparationFunction) {
    const maxColumns = Math.max(
      ...layers.map((layer) =>
        Math.max(...layer.map((node) => node.columnIndex + 1))
      )
    );
    // call columnWidthFunction for each column index to get an array with the width of each column index:
    let columnWidth = Array.from(Array(maxColumns).keys())
      .map((_, index) => index)
      .map(columnWidthFunction);
    // similarly for the separation of the columns, where columnSeparation[0] is the separation between column 0 and 1:
    let columnSeparation = Array.from(Array(maxColumns).keys())
      .map((_, index) => index)
      .map(columnSeparationFunction);

    const maxWidth = Math.max(
      ...layers.map((layer) => {
        layer.forEach((node) => {
          node.x0 = getColumnStartCoordinate(
            columnWidth,
            columnSeparation,
            node.columnIndex
          );
          node.x1 = node.x0 + columnWidth[node.columnIndex];
        });
        return Math.max(...layer.map((node) => node.x1));
      })
    );
    layers.forEach((layer) => {
      layer.forEach((node) => {
        node.x0 = node.x0 / maxWidth;
        node.x1 = node.x1 / maxWidth;
      });
    });
    return layers;
  }

  return coordSpread;

  function getColumnStartCoordinate(
    columnWidth,
    columnSeparation,
    columnIndex
  ) {
    let leadingColumnWidths = columnWidth.filter(
      (_, index) => index < columnIndex
    );
    let leadingColumnSeparations = columnSeparation.filter(
      (_, index) => index < columnIndex
    );
    return leadingColumnWidths
      .concat(leadingColumnSeparations)
      .reduce((prevVal, currentVal) => prevVal + currentVal, 0);
  }
}
