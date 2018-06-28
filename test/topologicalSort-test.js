const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../");

const square = JSON.parse(fs.readFileSync("test/data/square.json"));
const en = JSON.parse(fs.readFileSync("test/data/en.json"));

tape("topologicalSort() works for line", test => {
  const data = new Array(10).fill(null).map((_, i) => ({ id: i.toString(), parentIds: i ? [ (i - 1).toString() ] : [] }));
  const dag = d3_dag.dagStratify()(data);
  const res = d3_dag.topologicalSort(dag);
  test.equal(dag, res);
  test.ok(dag.every(n => n.id === n.value.toString()));
  test.end();
});

tape("topologicalSort() works for square", test => {
  const dag = d3_dag.dagStratify()(square);
  const res = d3_dag.topologicalSort(dag);
  test.equal(dag, res);

  const values = new Array(4);
  dag.forEach(n => values[n.value] = true)
  test.ok(values.every(v => v));

  test.equal(dag[0].value, 0)
  test.deepEqual(dag.slice(1, 3).map(d => d.value).sort(), [1, 2])
  test.equal(dag[3].value, 3)
  test.end();
});

tape("topologicalSort() works for N", test => {
  const dag = d3_dag.topologicalSort(d3_dag.dagStratify()(en));

  const values = new Array(4);
  dag.forEach(n => values[n.value] = true)
  test.ok(values.every(v => v));

  test.notEqual(-1, [0, 1, 2].indexOf(dag[0].value))
  test.notEqual(-1, [0, 1].indexOf(dag[1].value))
  test.notEqual(-1, [2, 3].indexOf(dag[2].value))
  test.notEqual(-1, [1, 2, 3].indexOf(dag[3].value))
  test.end();
});
