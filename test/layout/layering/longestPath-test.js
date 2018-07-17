const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../../");

const [grafo] = [
  "test/data/grafo.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("longestPath() works for grafo", test => {
  const layering = d3_dag.dagLayerLongestPath(grafo);
  test.equals(layering.length, 6);
  test.deepEquals(
    layering.map(l => l.length),
    [1, 3, 6, 8, 11, 5]);
  test.deepEquals(
    layering.map(l => l.filter(n => n.data).map(n => parseInt(n.id)).sort((a, b) => a - b)),
    [[21], [12], [2, 4, 8], [0, 9, 11, 13, 19], [1, 3, 15, 16, 17, 18, 20], [5, 6, 7, 10, 14]]);
  test.end();
});
