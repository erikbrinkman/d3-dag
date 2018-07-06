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
    dag.links().forEach(link => {
      const { source, target, points } = link;
      // XXX These are because of perceived bugs in dagre
      if (points) {
        points[0].y = source.y;
        points[points.length - 1].y = target.y;
        points.forEach(p => {
          p.x *= width / info.width;
          p.y *= height / info.height;
        });
      } else {
        link.points = [{x: source.x, y: source.y}, {x: target.x, y: target.y}];
      }
    });
    dag.nodes().forEach(node => {
      node.x *= width / info.width;
      node.y *= height / info.height;
    });
    return dag;
  }

  layout.size = function(x) {
    return arguments.length ? ([width, height] = x, layout) : [width, height];
  }

  return layout;
}
