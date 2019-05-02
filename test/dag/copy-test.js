const tape = require("tape"),
  load = require("../load");

tape("copy() works on square", (test) => {
  const root = load("square");
  const copy = root.copy();
  test.ok(root.equals(copy));
  test.ok(root.descendants().every((n, i) => n !== copy.descendants()[i]));
  test.ok(
    root
      .descendants()
      .every((n, i) => n.children !== copy.descendants()[i].children)
  );
  test.end();
});
