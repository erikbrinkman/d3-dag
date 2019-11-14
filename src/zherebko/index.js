// Compute a zherebko layout for a dag assigning each node an x and y
// coordinate, and optionally assigning each link a points field with the x and
// y coordinates for intermediary stops on the edge.
import greedy from "./greedy";

export default function() {
  let width = 1;
  let height = 1;
  let indexer = greedy();

  function zherebko(dag) {
    // Topological Sort
    const ordered = [];
    dag.eachBefore((node, i) => {
      node.layer = i;
      ordered.push(node);
    });

    // Get indices
    indexer(ordered);

    // Map to coordinates
    let minIndex = 0;
    let maxIndex = 0;
    dag.eachLinks(({ data }) => {
      minIndex = Math.min(minIndex, data.index);
      maxIndex = Math.max(maxIndex, data.index > 0 ? data.index : 1);
    });
    let maxLayer = ordered.length - 1;

    dag.each((node) => {
      if (maxLayer === 0) {
        // If there's just 1 node
        // we should just center it
        node.x = width / 2;
        node.y = height / 2;
      } else if (minIndex === maxIndex) {
        // If there are no links, we want to stack the
        // nodes vertically
        node.x = (node.layer / maxLayer) * width;
        node.y = height / 2;
      } else {
        node.x = (-minIndex / (maxIndex - minIndex)) * width;
        node.y = (node.layer / maxLayer) * height;
      }
    });
    dag.eachLinks(({ source, target, data }) => {
      const points = [{ x: source.x, y: source.y }];

      const x = ((data.index - minIndex) / (maxIndex - minIndex)) * width;
      const y1 = ((source.layer + 1) / maxLayer) * height;
      const y2 = ((target.layer - 1) / maxLayer) * height;
      if (target.layer - source.layer === 2) {
        points.push({ x: x, y: y1 });
      } else if (target.layer - source.layer > 2) {
        points.push({ x: x, y: y1 }, { x: x, y: y2 });
      }

      points.push({ x: target.x, y: target.y });
      data.points = points;
    });
    return dag;
  }

  zherebko.size = function(x) {
    return arguments.length
      ? (([width, height] = x), zherebko)
      : [width, height];
  };

  return zherebko;
}
