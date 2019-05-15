// Compute x0 and x1 coordinates for nodes that maximizes the spread of nodes in [0, 1]
export default function() {
    const nodeWidth = 10;
    function coordSpread(layers, separation) {
      const maxWidth = Math.max(
        ...layers.map((layer) => {
          layer[0].x0 = 0;
          layer[0].x1 = nodeWidth;
          layer.slice(1).forEach((node, i) => {
            const prev = layer[i];
            node.x0 = prev.x1 + separation(prev, node);
            node.x1 = node.x0 + nodeWidth;
          });
          return layer[layer.length - 1].x1;
        })
      );
      layers.forEach((layer) => {
        const halfWidth = layer[layer.length - 1].x1 / 2;
        layer.forEach((node) => {
          node.x0 = (node.x0 - halfWidth) / maxWidth + 0.5;
          node.x1 = (node.x1 - halfWidth) / maxWidth + 0.5;
        });
      });
      return layers;
    }
  
    return coordSpread;
  }
  