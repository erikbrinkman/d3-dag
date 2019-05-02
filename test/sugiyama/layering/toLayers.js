module.exports = function(dag) {
  const layers = [];
  dag.each((n) =>
    (layers[n.layer] || (layers[n.layer] = [])).push(parseInt(n.id))
  );
  layers.forEach((l) => l.sort((a, b) => a - b));
  return layers;
};
