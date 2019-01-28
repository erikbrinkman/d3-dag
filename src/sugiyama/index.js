// Compute a sugiyama layout for a dag assigning each node an x and y
// coordinate, and optionally assigning each link a points field with the x and
// y coordinates for intermediary stops on the edge.
import Node from "../dag";
import simplex from "./layering/simplex";
import twoLayer from "./decross/twoLayer";
import greedy from "./coord/greedy";

export default function() {
  let debug = false;
  let width = 1;
  let height = 1;
  let layering = simplex();
  let decross = twoLayer();
  let coord = greedy();
  let separation = defaultSeparation;

  // Takes a dag where nodes have a layer attribute, and adds dummy nodes so each
  // layer is adjacent, and returns an array of each layer of nodes.
  function createLayers(dag) {
    const layers = [];
    dag.descendants().forEach(node => {
      const layer = layers[node.layer] || (layers[node.layer] = []);
      layer.push(node);
      node.children = node.children.map(child => {
        if (child.layer > node.layer + 1) {
          let last = child;
          for (let l = child.layer - 1; l > node.layer; l--) {
            const dummy = new Node(`${node.id}${debug ? "->" : "\0"}${child.id}${debug ? " (" : "\0"}${l}${debug ? ")" : ""}`, undefined);
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
    dag.each(node => {
      if (node.data) {
        node.children = node.children.map(child => {
          const points = [{x: node.x, y: node.y}];
          while (!child.data) {
            points.push({x: child.x, y: child.y});
            [child] = child.children;
          }
          points.push({x: child.x, y: child.y});
          (node._childLinkData[child.id] || (node._childLinkData[child.id] = {})).points = points;
          return child
        });
      }
    });
  }

  function sugiyama(dag) {
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
      // This will also be true if layers.length === 1
      layers.forEach(([n]) => n.x = width / 2);
    } else {
      // Minimize edge crossings
      decross(layers);
      // Assign coordinates
      coord(layers, separation);
      // Scale x
      layers.forEach(layer => layer.forEach(n => n.x *= width));
    }
    // Remove dummy nodes and update edge data
    removeDummies(dag);
    return dag;
  }

  sugiyama.debug = function(x) {
    return arguments.length ? (debug = x, sugiyama) : debug;
  }

  sugiyama.size = function(x) {
    return arguments.length ? ([width, height] = x, sugiyama) : [width, height];
  }

  sugiyama.layering = function(x) {
    return arguments.length ? (layering = x, sugiyama) : layering;
  }

  sugiyama.decross = function(x) {
    return arguments.length ? (decross = x, sugiyama) : decross;
  }

  sugiyama.coord = function(x) {
    return arguments.length ? (coord = x, sugiyama) : coord;
  }

  sugiyama.separation = function(x) {
    return arguments.length ? (separation = x, sugiyama) : separation;
  }

  return sugiyama;
}

function defaultSeparation() {
  return 1;
}
