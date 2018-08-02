// FIXME Decide on name / prefix of layering, decross, cord or w/e
import Node from "../dag/node";
import longestPath from "./layering/longestPath";
import spread from "./coords/spread";

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

function noop() {}

export default function() {
  let layering = longestPath;
  let decross = noop;
  let coords = spread;
  let width = 1;
  let height = 1;

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
    // Minimize edge crossings
    decross(layers);
    // Assign coordinates
    coords(layers);
    // Scale x
    layers.forEach(layer => layer.forEach(n => n.x *= width));
    // Remove dummy nodes and update edge data
    removeDummies(dag);
    return dag;
  }

  layout.width = function(x) {
    return arguments.length ? (width = x, layout) : width;
  }

  layout.height = function(x) {
    return arguments.length ? (height = x, layout) : height;
  }

  layout.layering = function(x) {
    return arguments.length ? (layering = x, layout) : layering;
  }

  layout.decross = function(x) {
    return arguments.length ? (decross = x, layout) : decross;
  }

  layout.coords = function(x) {
    return arguments.length ? (coords = x, layout) : coords;
  }

  return layout;
}
