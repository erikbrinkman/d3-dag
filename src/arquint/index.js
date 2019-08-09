import Node from "../dag";
import layeringLongestPath from "../sugiyama/layering/longestPath";
import twoLayer from "../sugiyama/decross/twoLayer";
import coordRect from "./coord/coordRect";
import complex from "./column/complex";

export default function() {
  let debug = false;
  let width = 1;
  let height = 1;
  let layering = layeringLongestPath().topDown(false);
  let decross = twoLayer();
  let columnAssignment = complex().center(true);
  let coord = coordRect();
  let interLayerSeparation = defaultLayerSeparation;
  let columnWidth = defaultColumnWidth;
  let columnSeparation = defaultColumnSeparation;

  // Takes a dag where nodes have a layer attribute, and adds dummy nodes so each
  // layer is adjacent, and returns an array of each layer of nodes.
  function createLayers(dag) {
    const layers = [];
    const maxLayer = Math.max(
      0,
      ...dag.descendants().map((node) => node.layer)
    );
    dag.descendants().forEach((node) => {
      const layer = layers[node.layer] || (layers[node.layer] = []);
      layer.push(node);
      node.children = node.children.map((child) => {
        if (child.layer > node.layer + 1) {
          // child is not in the next layer of node => insert nodes in the intermediate layers
          let last = child;
          for (let l = child.layer - 1; l > node.layer; l--) {
            const dummy = new Node(
              `${node.id}${debug ? "->" : "\0"}${child.id}${
                debug ? " (" : "\0"
              }${l}${debug ? ")" : ""}`,
              undefined
            );
            dummy.children = [last];
            (layers[l] || (layers[l] = [])).push(dummy);
            last = dummy;
          }
          return last;
        } else {
          return child;
        }
      });
      if (node.children.length === 0 && node.layer < maxLayer) {
        // insert a dummy node per layer
        let highestLayerNode = new Node(
          `${node.id}${debug ? "->" : "\0"}${debug ? " (" : "\0"}${maxLayer}${
            debug ? ")" : ""
          }`,
          undefined
        );
        (layers[maxLayer] || (layers[maxLayer] = [])).push(highestLayerNode);
        let last = highestLayerNode;
        for (let l = maxLayer - 1; l > node.layer; l--) {
          const dummy = new Node(
            `${node.id}${debug ? "->" : "\0"}${highestLayerNode.id}${
              debug ? " (" : "\0"
            }${l}${debug ? ")" : ""}`,
            undefined
          );
          dummy.children = [last];
          (layers[l] || (layers[l] = [])).push(dummy);
          last = dummy;
        }
        node.children = [last];
      }
    });
    return layers;
  }

  function removeDummies(dag) {
    dag.eachAfter((node) => {
      node.children = filterChildren(node.children);
    });

    function filterChildren(children) {
      let filteredChildren = children;
      let i = 0;
      while (i < filteredChildren.length) {
        if (filteredChildren[i].data) {
          i++;
          continue;
        }
        let grandchildren = filteredChildren[i].children;
        if (grandchildren.length === 0) {
          filteredChildren.splice(i, 1);
        } else {
          filteredChildren.splice(i, 1, ...grandchildren);
          i += grandchildren.length;
        }
      }
      return filteredChildren;
    }
  }

  function updateEdgeData(dag) {
    dag.each((node) => {
      node._childLinkData = node.children.map((child) => {
        return [
          { x: node.x0 + (node.x1 - node.x0) / 2, y: node.y1 },
          { x: child.x0 + (child.x1 - child.x0) / 2, y: child.y0 }
        ];
      });
    });
  }

  function createParentsRelation(dag) {
    dag.each((node) =>
      node.children.forEach((child) =>
        (child.parents || (child.parents = [])).push(node)
      )
    );
  }

  function getLongestPathValue(dag) {
    let rootPaths = dag.roots().map(getLongestPathSubDag);
    return Math.max(0, ...rootPaths);
  }

  function getLongestPathSubDag(node) {
    let childPaths = node.children.map(getLongestPathSubDag);
    return (node.heightRatio || 0) + Math.max(0, ...childPaths);
  }

  // includes heightRatio of node
  function getLongestPathValueToRoot(node) {
    let parentPaths = node.parents
      ? node.parents.map(getLongestPathValueToRoot)
      : [];
    return (node.heightRatio || 0) + Math.max(0, ...parentPaths);
  }

  function arquint(dag) {
    let longestPathValue = getLongestPathValue(dag);
    // Compute layers
    layering(dag);
    // Verify layering
    if (
      !dag.every((node) => node.children.every((c) => c.layer > node.layer))
    ) {
      throw new Error("layering wasn't proper");
    }
    // Create layers
    const layers = createLayers(dag);
    // Assign y
    if (layers.length === 1) {
      const [layer] = layers;
      layer.forEach((n) => {
        n.y0 = 0;
        n.y1 = 1;
      });
    } else {
      createParentsRelation(dag);
      let totalLayerSeparation = layers.reduce(
        (prevVal, layer, i) =>
          prevVal + (i == 0 ? 0 : interLayerSeparation(layer, i)),
        0
      );
      let pathLength = longestPathValue + totalLayerSeparation;
      let cummulativeLayerSeparation = 0;
      layers.forEach((layer, i) => {
        cummulativeLayerSeparation +=
          i == 0 ? 0 : interLayerSeparation(layer, i);
        layer.forEach((n) => {
          let pathValueToRoot = getLongestPathValueToRoot(n);
          n.y1 = (cummulativeLayerSeparation + pathValueToRoot) / pathLength;
          n.y0 = n.y1 - n.heightRatio / pathLength;
        });
      });
    }

    // Minimize edge crossings
    decross(layers);
    // assign an index to each node indicating the "column" in which it should be placed
    columnAssignment(layers);
    // Assign coordinates
    coord(layers, columnWidth, columnSeparation);
    // Scale x and y
    layers.forEach((layer) =>
      layer.forEach((n) => {
        n.x0 *= width;
        n.x1 *= width;
        n.y0 *= height;
        n.y1 *= height;
      })
    );
    // Remove dummy nodes and update edge data
    removeDummies(dag);
    updateEdgeData(dag);
    return dag;
  }

  arquint.size = function(x) {
    return arguments.length
      ? (([width, height] = x), arquint)
      : [width, height];
  };

  arquint.layering = function(x) {
    return arguments.length ? ((layering = x), arquint) : layering;
  };

  arquint.decross = function(x) {
    return arguments.length ? ((decross = x), arquint) : decross;
  };

  arquint.columnAssignment = function(x) {
    return arguments.length
      ? ((columnAssignment = x), arquint)
      : columnAssignment;
  };

  arquint.coord = function(x) {
    return arguments.length ? ((coord = x), arquint) : coord;
  };

  arquint.interLayerSeparation = function(x) {
    return arguments.length
      ? ((interLayerSeparation = x), arquint)
      : interLayerSeparation;
  };

  arquint.columnWidth = function(x) {
    return arguments.length ? ((columnWidth = x), arquint) : columnWidth;
  };

  arquint.columnSeparation = function(x) {
    return arguments.length
      ? ((columnSeparation = x), arquint)
      : columnSeparation;
  };

  return arquint;
}

function defaultLayerSeparation() {
  return 1;
}

function defaultColumnWidth() {
  return 10;
}

function defaultColumnSeparation() {
  return 1;
}
