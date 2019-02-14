// Order nodes using two layer algorithm
import median from "../twolayer/median";

// TODO Add number of passes, with 0 being keep passing up and down until no changes (is this guaranteed to never change?, maybe always terminate if no changes, so this can be set very high to almost achieve that effect)
// TODO Add optional greedy swapping of nodes after assignment
// TODO Add two layer noop. This only makes sense if there's a greedy swapping ability

export default function() {
  let order = median();

  function decrossTwoLayer(layers) {
    layers
      .slice(0, layers.length - 1)
      .forEach((layer, i) => order(layer, layers[i + 1]));
    return layers;
  }

  decrossTwoLayer.order = function(x) {
    return arguments.length ? ((order = x), decrossTwoLayer) : order;
  };

  return decrossTwoLayer;
}
