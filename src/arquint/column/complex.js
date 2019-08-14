export default function() {
  let center = false;

  function columnIndexAssignmentSubtree(layers) {
    // starts at root nodes and assigns column indices based on their subtrees
    if (layers.length == 0) {
      return;
    }

    // find all root nodes
    let roots = [];
    layers.forEach((layer) => layer.forEach((node) => {
      if (node.parents == null || node.parents.length === 0) {
        roots.push(node);
      }
    }));

    // iterate over each root and assign column indices to each node in its subtree.
    // if a node already has a columnIndex, do not change it, this case can occur if the node has more than one predecessor
    let startColumnIndex = 0;
    roots.forEach((node) => {
      const subtreeWidth = getSubtreeWidth(node);
      node.columnIndex =
        startColumnIndex + (center ? Math.floor((subtreeWidth - 1) / 2) : 0);
      assignColumnIndexToChildren(node, startColumnIndex);
      startColumnIndex += subtreeWidth;
    });

    function getSubtreeWidth(node) {
      if (node.children.length === 0) {
        return 1;
      }
      return node.children.reduce(
        (prevVal, child) => prevVal + getSubtreeWidth(child),
        0
      );
    }

    function assignColumnIndexToChildren(node, startColumnIndex) {
      const widthPerChild = node.children.map(getSubtreeWidth);
      let childColumnIndex = startColumnIndex;
      node.children.forEach((child, index) => {
        if (child.columnIndex !== undefined) {
          // stop recursion, this child was already visited
          return;
        }
        child.columnIndex =
          childColumnIndex +
          (center ? Math.floor((widthPerChild[index] - 1) / 2) : 0);
        assignColumnIndexToChildren(child, childColumnIndex);
        childColumnIndex += widthPerChild[index];
      });
    }
  }

  columnIndexAssignmentSubtree.center = function(x) {
    return arguments.length
      ? ((center = x), columnIndexAssignmentSubtree)
      : center;
  };

  return columnIndexAssignmentSubtree;
}
