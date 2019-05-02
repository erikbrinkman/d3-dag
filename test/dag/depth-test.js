const tape = require("tape"),
  load = require("../load");

tape("depth() is correct for square", (test) => {
  const dag = load("square").depth();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [0, 1, 1, 2]
  );
  test.end();
});

tape("depth() is correct for N", (test) => {
  const dag = load("en");

  const [one] = dag.descendants().filter((n) => n.id === "2");
  one.depth();
  test.equals(one.value, 0);

  dag.depth();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [0, 0, 1, 1]
  );

  test.end();
});

tape("depth() is correct for X", (test) => {
  const dag = load("ex").depth();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [0, 1, 0, 2, 3, 3, 4]
  );
  test.end();
});
