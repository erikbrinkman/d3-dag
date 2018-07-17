import longestPath from "./layering/longestPath";
import spread from "./coords/spread";

function noop() {}

export default function() {
  let layering = longestPath;
  let decross = noop;
  let coords = spread;
  let width = 1;
  let height = 1;

  function layout(dag) {
    // Compute layers
    const layers = layering(dag);
    // Minimize edge crossings
    decross(layers);
    // Assign coordinates
    coords(layers, width, height);
    // Remove dummy nodes and update edge data
    dag.nodes().forEach(node => {
      if (!node.data) {
        const [parent] = node.parents;
        const [child] = node.children;

        parent.children[parent.children.indexOf(node)] = child;
        child.parents[child.parents.indexOf(node)] = parent;

        const edgeData = parent._childLinkData[node.id];
        delete parent._childLinkData[node.id];
        const points = edgeData.points || (edgeData.points = []);
        points.push({x: node.x, y: node.y}, ...(node._childLinkData[child.id].points || []));
        const oldData = parent._childLinkData[child.id] || (parent._childLinkData[child.id] = {});
        Object.assign(oldData, edgeData);
      }
    });
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
