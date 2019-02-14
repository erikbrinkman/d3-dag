const tape = require("tape"),
  load = require("../load");

tape("size() is correct for square", (test) => {
  test.equals(4, load("square").size());
  test.end();
});

tape("size() is correct for N", (test) => {
  test.equals(4, load("en").size());
  test.end();
});

tape("size() is correct for X", (test) => {
  test.equals(7, load("ex").size());
  test.end();
});
