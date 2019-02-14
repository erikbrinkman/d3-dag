const tape = require("tape"),
  load = require("../load");

tape("count() is correct for square", (test) => {
  const dag = load("square").count();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [1, 1, 1, 1],
  );
  test.end();
});

tape("count() is correct for N", (test) => {
  const dag = load("en").count();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [1, 2, 1, 1],
  );
  test.end();
});

tape("count() is correct for X", (test) => {
  const dag = load("ex").count();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [2, 2, 2, 2, 1, 1, 1],
  );
  test.end();
});
