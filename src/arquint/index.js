import Node from "../dag";
import layeringLongestPath from "../sugiyama/layering/longestPath";
import twoLayer from "../sugiyama/decross/twoLayer";
import center from "./coord/centerRect";

export default function() {
    let debug = false;
    let width = 1;
    let height = 1;
    let layering = layeringLongestPath();
    let decross = twoLayer();
    let coord = center();
    let intraLayerSeparation = defaultSeparation;
    let interLayerSeparation = defaultSeparation;

    // Takes a dag where nodes have a layer attribute, and adds dummy nodes so each
  // layer is adjacent, and returns an array of each layer of nodes.
  function createLayers(dag) {
    const layers = [];
    dag.descendants().forEach((node) => {
      const layer = layers[node.layer] || (layers[node.layer] = []);
      layer.push(node);
      node.children = node.children.map((child) => {
        if (child.layer > node.layer + 1) {
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
    });
    return layers;
  }

  function removeDummies(dag) {
    dag.each((node) => {
      if (node.data) {
        node.children = node.children.map((child, i) => {
          const points = [{ x: node.x, y: node.y1 }];
          while (!child.data) {
            points.push({ x: child.x, y: child.y0 });
            [child] = child.children;
          }
          points.push({ x: child.x, y: child.y0 });
          node._childLinkData[i].points = points;
          return child;
        });
      }
    });
  }

    function getLongestPathValue(dag) {
        let rootPaths = dag.roots().map(getLongestPathSubDag);
        return Math.max(0, ...rootPaths);
    }

    function getLongestPathSubDag(node) {
        let childPaths = node.children.map(getLongestPathSubDag);
        return (node.heightRatio || 0) + Math.max(0, ...childPaths);
    }

    function arquint(dag) {
        let longestPathValue = getLongestPathValue(dag);
        // Compute layers
        layering(dag);
        // Verify layering
        if (!dag.every((node) => node.children.every((c) => c.layer > node.layer)))
          throw new Error("layering wasn't proper");
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
            let totalLayerSeparation = layers.reduce((prevVal, layer, i) => (prevVal + (i == 0 ? 0 : interLayerSeparation(layer))), 0);
            let pathLength = longestPathValue + totalLayerSeparation;
            let cummulativeLayerSeparation = 0;
            layers.forEach((layer, i) => {
                cummulativeLayerSeparation += (i == 0 ? 0 : interLayerSeparation(layer, i));
                return layer.forEach((n) => {
                    let subDagPathValue = getLongestPathSubDag(n);
                    n.y0 = (cummulativeLayerSeparation + longestPathValue - subDagPathValue) / pathLength;
                    n.y1 = n.y0 + n.heightRatio / pathLength;
                    // n.y0 = cummulativeLayerSeparation + (longestPathValue - subDagPathValue) / longestPathValue * (height - totalLayerSeparation);
                    // n.y1 = n.y0 + n.heightRatio / longestPathValue * (height - totalLayerSeparation);
                });
            });
        }
        // if (layers.every((l) => l.length === 1)) {
          // Next steps aren't necessary
          // This will also be true if layers.length === 1
          // layers.forEach(([n]) => (n.x = width / 2));
        // } else {
          // Minimize edge crossings
          decross(layers);
          // Assign coordinates
          coord(layers, intraLayerSeparation);
          // Scale x and y
          layers.forEach((layer) => layer.forEach((n) => {
            n.x0 *= width;
            n.x1 *= width;
            n.y0 *= height;
            n.y1 *= height;
          }));
        // }
        // Remove dummy nodes and update edge data
        removeDummies(dag);
        return dag;
    }

    arquint.size = function(x) {
        return arguments.length
            ? (([width, height] = x), arquint)
            : [width, height];
    };

    arquint.intraLayerSeparation = function(x) {
        return arguments.length ? ((intraLayerSeparation = x), arquint) : intraLayerSeparation;
    };

    arquint.interLayerSeparation = function(x) {
        return arguments.length ? ((interLayerSeparation = x), arquint) : interLayerSeparation;
    };

    return arquint;
}

function defaultSeparation() {
    return 1;
}
