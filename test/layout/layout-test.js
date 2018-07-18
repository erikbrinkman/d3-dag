const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const [grafo] = [
  "test/data/grafo.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("layout() works for grafo", test => {
  const nodesBefore = grafo.nodes().length;
  const layout = d3_dag.dagLayout().width(2).height(2);
  const dag = layout(grafo);
  test.equals(dag.nodes().length, nodesBefore);
  

  d3_dag.dagLayerLongestPath(grafo);
  const maxLayer = grafo.nodes().reduce((l, n) => Math.max(l, n.layer), 0);
  test.equals(maxLayer, 5);
  const layers = new Array(6).fill(null).map(() => []);
  grafo.eachDepth(n => layers[n.layer].push(parseInt(n.id)));
  test.deepEquals(
    layers.map(l => l.sort((a, b) => a - b)),
    [[21], [12], [2, 4, 8], [0, 9, 11, 13, 19], [1, 3, 15, 16, 17, 18, 20], [5, 6, 7, 10, 14]]);
  test.end();
});
