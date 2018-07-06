import * as dagre from "dagre"

export default function() {
  let width = 1,
    height = 1;

  function layout(dag) {
    const g = new dagre.graphlib.Graph(),
      info = {};
    g.setGraph(info);
    dag.nodes().forEach(n => g.setNode(n.id, n));
    dag.links().forEach(l => g.setEdge(l.source.id, l.target.id, l));
    dagre.layout(g);

    // Rescale
    dag.nodes().forEach(node => {
      node.x *= width / info.width;
      node.y *= height / info.height;
    });
    dag.links().forEach(({source, target, points}) => {
      points.forEach(p => {
        p.x *= width / info.width;
        p.y *= height / info.height;
      });
      points.unshift({x: source.x, y: source.y});
      points.push({x: target.x, y: target.y});
    });
    return dag;
  }

  layout.size = function(x) {
    return arguments.length ? ([width, height] = x, layout) : [width, height];
  }

  return layout;
}
