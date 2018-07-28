export default function(layers) {
  if (layers.length === 1) { // Only possible with one node
    const [[node]] = layers;
    node.x = 1 / 2;
    node.y = 1 / 2;
  } else {
    layers.forEach((layer, i) => {
      const y = i / (layers.length - 1);
      if (layer.length === 1) {
        const [node] = layer;
        node.x = 1 / 2;
        node.y = y;
      } else {
        layer.forEach((node, j) => {
          node.x = j / (layer.length - 1);
          node.y = y;
        });
      }
    });
  }
}
