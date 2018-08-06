// Compute a sugiyama layout for a dag assigning each node an x and y
// coordinate, and optionally assigning each link a points field with the x and
// y coordinates for intermediary stops on the edge.
import Node from "../dag/node";
import simplex from "./layering/simplex";
import opt from "./decross/opt";
import minDist from "./coord/minDist";

// Takes a dag where nodes have a layer attribute, and adds dummy nodes so each
// layer is adjacent, and returns an array of each layer of nodes.
function createLayers(dag) {
  const layers = [];
  dag.nodes().forEach(node => {
    const layer = layers[node.layer] || (layers[node.layer] = []);
    layer.push(node);
    node.children = node.children.map(child => {
      if (child.layer > node.layer + 1) {
        child.parents.splice(child.parents.indexOf(node), 1);
        let last = child;
        for (let l = child.layer - 1; l > node.layer; l--) {
          const dummy = new Node(`${node.id}\0${child.id}\0${l}`, undefined);
          dummy.children = [last];
          dummy.parents = [];
          (layers[l] || (layers[l] = [])).push(dummy);
          last.parents.push(dummy);
          last = dummy;
        }
        last.parents.push(node);
        return last;
      } else {
        return child;
      }
    }); 
  });
  return layers;
}

function removeDummies(dag) {
  dag.nodes().forEach(node => {
    if (!node.data) {
      const [parent] = node.parents;
      const [child] = node.children;

      parent.children[parent.children.indexOf(node)] = child;
      child.parents[child.parents.indexOf(node)] = parent;

      const edgeData = parent._childLinkData[node.id] || {};
      delete parent._childLinkData[node.id];
      const points = edgeData.points || (edgeData.points = []);
      points.push({x: node.x, y: node.y}, ...((node._childLinkData[child.id] || {}).points || []));
      const oldData = parent._childLinkData[child.id] || (parent._childLinkData[child.id] = {});
      Object.assign(oldData, edgeData);
    }
  });
}

// FIXME Is the API for the decross and coord functions?
// Maybe next pointers would be better to define layer ordering?

export default function() {
  let width = 1;
  let height = 1;
  let layering = simplex;
  let decross = opt;
  let coord = minDist;

  function layout(dag) {
    // Compute layers
    layering(dag);
    // Verify layering
    if (!dag.every(node => node.children.every(c => c.layer > node.layer))) throw new Error("layering wasn't proper");
    // Create layers
    const layers = createLayers(dag);
    // Assign y
    if (layers.length === 1) {
      const [layer] = layers;
      layer.forEach(n => n.y = height / 2);
    } else {
      layers.forEach((layer, i) => layer.forEach(n => n.y = height * i / (layers.length - 1)));
    }
    if (layers.every(l => l.length === 1)) {
      // Next steps aren't necessary
      layers.forEach(([n]) => n.x = width / 2);
    } else {
      // Minimize edge crossings
      decross(layers);
      // Assign coordinates
      coord(layers);
      // Scale x
      layers.forEach(layer => layer.forEach(n => n.x *= width));
    }
    // Remove dummy nodes and update edge data
    removeDummies(dag);
    return dag;
  }

  layout.size = function(x) {
    return arguments.length ? ([width, height] = x, layout) : [width, height];
  }

  layout.layering = function(x) {
    return arguments.length ? (layering = x, layout) : layering;
  }

  layout.decross = function(x) {
    return arguments.length ? (decross = x, layout) : decross;
  }

  layout.coord = function(x) {
    return arguments.length ? (coord = x, layout) : coord;
  }

  return layout;
}
