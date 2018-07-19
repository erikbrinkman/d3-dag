const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../../");

const [square, grafo] = [
  "test/data/square.json",
  "test/data/grafo.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("opt() works for grafo", test => {
  const layout = d3_dag.dagLayout()
    .decross(d3_dag.dagCrossingOpt)
    .width(140)
    .height(5);
  layout(grafo);
  const ordered = grafo.nodes().sort((a, b) => a.id - b.id);
  test.deepEquals(
    ordered.map(n => n.y),
    [3, 4, 2, 4, 2, 5, 5, 5, 2, 3, 5, 3, 1, 3, 5, 4, 4, 4, 4, 3, 4, 0]);
  // This is potentially britle, as there are many orientations that remove all crossings
  test.deepEquals(
    ordered.map(n => n.x),
    [120, 112, 28, 14, 84, 70, 35, 0, 112, 80, 140, 20, 70, 40, 105, 70, 126, 42, 84, 60, 28, 70]);
  test.end();
});

