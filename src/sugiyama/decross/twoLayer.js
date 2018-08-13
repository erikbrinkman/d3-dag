// Order nodes using two layer algorithm
import median from "../twolayer/median";

// FIXME Add number of passes, with 0 being keep passing up and down until no changes for two passes up and down, or one pass?
export default function() {
  let order = median();
  
  function decrossTwoLayer(layers) {
    layers.slice(0, layers.length - 1).forEach((layer, i) => order(layer, layers[i + 1]));
    return layers;
  }

  decrossTwoLayer.order = function(x) {
    return arguments.length ? (order = x, decrossTwoLayer) : order;
  }

  return decrossTwoLayer;
}
