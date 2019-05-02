// Compute x coordinates for nodes that maximizes the spread of nodes in [0, 1]
export default function() {
  function coordSpread(layers, separation) {
    const maxWidth = Math.max(
      ...layers.map((layer) => {
        layer[0].x = 0;
        layer.slice(1).forEach((node, i) => {
          const prev = layer[i];
          node.x = prev.x + separation(prev, node);
        });
        return layer[layer.length - 1].x;
      })
    );
    layers.forEach((layer) => {
      const halfWidth = layer[layer.length - 1].x / 2;
      layer.forEach((node) => {
        node.x = (node.x - halfWidth) / maxWidth + 0.5;
      });
    });
    return layers;
  }

  return coordSpread;
}
