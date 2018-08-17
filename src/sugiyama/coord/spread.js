// Compute x coordinates for nodes that maximizes the spread of nodes in [0, 1]
export default function() {
  
  function coordSpread(layers, separation) {
    layers.forEach(layer => {
      if (layer.length === 1) {
        const [node] = layer;
        node.x = 1 / 2;
      } else {
        layer.reduce((last, node) => {
          node.x = last === undefined ? 0 : last.x + separation(last, node);
          return node;
        }, undefined)
        const width = layer[layer.length - 1].x;
        layer.forEach(n => n.x /= width);
      }
    });
    return layers;
  }

  return coordSpread;
}
