// Compute x coordinates for nodes that greedily assigns coordinates and then spaces them out

// TODO Implement other methods for initial greedy assignment

export default function() {
  let assignment = mean;

  function coordGreedy(layers, separation) {
    // Assign degrees
    // The 3 at the end ensures that dummy nodes have the lowest priority
    layers.forEach((layer) =>
      layer.forEach((n) => (n.degree = n.children.length + (n.data ? 0 : -3)))
    );
    layers.forEach((layer) =>
      layer.forEach((n) => n.children.forEach((c) => ++c.degree))
    );

    // Set first nodes
    layers[0][0].x = 0;
    layers[0].slice(1).forEach((node, i) => {
      const last = layers[0][i];
      node.x = last.x + separation(last, node);
    });

    // Set remaining nodes
    layers.slice(0, layers.length - 1).forEach((top, i) => {
      const bottom = layers[i + 1];
      assignment(top, bottom);
      // FIXME This order is import, i.e. we right and then left. We should actually do both, and then take the average
      bottom
        .map((n, j) => [n, j])
        .sort(([an, aj], [bn, bj]) =>
          an.degree === bn.degree ? aj - bj : bn.degree - an.degree
        )
        .forEach(([n, j]) => {
          bottom.slice(j + 1).reduce((last, node) => {
            node.x = Math.max(node.x, last.x + separation(last, node));
            return node;
          }, n);
          bottom
            .slice(0, j)
            .reverse()
            .reduce((last, node) => {
              node.x = Math.min(node.x, last.x - separation(node, last));
              return node;
            }, n);
        });
    });

    const min = Math.min(
      ...layers.map((layer) => Math.min(...layer.map((n) => n.x)))
    );
    const span =
      Math.max(...layers.map((layer) => Math.max(...layer.map((n) => n.x)))) -
      min;
    layers.forEach((layer) => layer.forEach((n) => (n.x = (n.x - min) / span)));
    layers.forEach((layer) => layer.forEach((n) => delete n.degree));
    return layers;
  }

  return coordGreedy;
}

function mean(topLayer, bottomLayer) {
  bottomLayer.forEach((node) => {
    node.x = 0.0;
    node._count = 0.0;
  });
  topLayer.forEach((n) =>
    n.children.forEach((c) => (c.x += (n.x - c.x) / ++c._count))
  );
  bottomLayer.forEach((n) => delete n._count);
}
