export default function(layers, width, height) {
  if (layers.length === 1) { // Only possible with one node
    const [[node]] = layers;
    node.x = width / 2;
    node.y = height / 2;
  } else {
    layers.forEach((layer, i) => {
      const y = i / (layers.length - 1) * height;
      if (layer.length === 1) {
        const [node] = layer;
        node.x = width / 2;
        node.y = y;
      } else {
        layer.forEach((node, j) => {
          node.x = j / (layer.length - 1) * width;
          node.y = y;
        });
      }
    });
  }
}
