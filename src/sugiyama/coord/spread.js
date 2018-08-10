// Compute x coordinates for nodes that maximizes the spread of nodes in [0, 1]
export default function(layers) {
  layers.forEach(layer => {
    if (layer.length === 1) {
      const [node] = layer;
      node.x = 1 / 2;
    } else {
      layer.forEach((n, j) => n.x = j / (layer.length - 1));
    }
  });
  return layers;
}
