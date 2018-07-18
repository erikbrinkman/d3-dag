const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../../");

const [square, grafo] = [
  "test/data/square.json",
  "test/data/grafo.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

function toLayers(dag) {
  const layers = [];
  dag.eachDepth(n => (layers[n.layer] || (layers[n.layer] = [])).push(parseInt(n.id)));
  layers.forEach(l => l.sort((a, b) => a - b));
  return layers;
}

tape("simplex() works for square", test => {
  d3_dag.dagLayerLongestPath(square);
  const layers = toLayers(square);
  test.equals(layers.length, 3);
  test.deepEquals(layers, [[0], [1, 2], [3]]);
  test.end();
});

tape("simplex() works for grafo", test => {
  d3_dag.dagLayerSimplex(grafo);
  const layers = toLayers(grafo);
  test.equals(layers.length, 8);
  const cost = grafo.links().reduce((s, l) => s + l.target.layer - l.source.layer, 0);
  test.equals(cost, 30);
  // XXX There are two possible configurations
  test.deepEquals(
    layers,
    [[1, 8], [0, 14], [16, 21], [10, 12], [2, 4, 19], [9, 11, 13, 15, 17], [3, 6, 18, 20], [5, 7]]);
  test.end();
});
