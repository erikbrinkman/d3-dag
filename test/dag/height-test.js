const tape = require("tape"),
  load = require("../load");

tape("height() is correct for square", (test) => {
  const dag = load("square").height();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [2, 1, 1, 0]
  );
  test.end();
});

tape("height() is correct for N", (test) => {
  const dag = load("en").height();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [1, 1, 0, 0]
  );
  test.end();
});

tape("height() is correct for X", (test) => {
  const dag = load("ex").height();
  test.deepEquals(
    dag
      .descendants()
      .sort((a, b) => a.id - b.id)
      .map((n) => n.value),
    [4, 3, 3, 2, 0, 1, 0]
  );
  test.end();
});
