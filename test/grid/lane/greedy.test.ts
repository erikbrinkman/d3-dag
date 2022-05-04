import { connect } from "../../../src/dag/create";
import { greedy } from "../../../src/grid/lane/greedy";
import { dummy, en, ex, three, trip } from "../../examples";
import { crossings, hard, prepare } from "./utils";

test("greedy() works for triangle", () => {
  const nodes = prepare(dummy());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 1, 0]);
});

test("greedy() works for triangle bottom-up", () => {
  const nodes = prepare(dummy());
  const layout = greedy().topDown(false);
  expect(layout.topDown()).toBe(false);
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 1, 0]);
});

test("greedy() works for ex", () => {
  const nodes = prepare(ex());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 0, 1, 0, 1, 0, 0]);
});

test("greedy() compresses", () => {
  const creator = connect();
  const nodes = prepare(
    creator([
      ["0", "9"],
      ["1", "4"],
      ["2", "8"],
      ["3", "5"],
      // this node could be put in two places, to minimize edge distance, or
      // overall width
      ["5", "6"],
      ["5", "7"],
    ])
  );
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 1, 2, 3, 1, 3, 1, 3, 2, 0]);

  const uncompressed = layout.compressed(false);
  expect(uncompressed.compressed()).toBe(false);
  uncompressed(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 1, 2, 3, 1, 3, 4, 3, 2, 0]);
});

test("greedy() bidirectionalizes en", () => {
  const nodes = prepare(en());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 2, 1, 0]);

  const bidirec = layout.bidirectional(true);
  expect(bidirec.bidirectional()).toBe(true);
  bidirec(nodes);
  expect(nodes.map((n) => n.x)).toEqual([1, 0, 2, 1]);
});

test("greedy() bidirectionalizes three", () => {
  const nodes = prepare(three());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 2, 1, 0, 2]);

  const bidirec = layout.bidirectional(true);
  bidirec(nodes);
  expect(nodes.map((n) => n.x)).toEqual([1, 0, 2, 1, 0]);
});

test("greedy() compresses bidirectionally", () => {
  const creator = connect();
  const nodes = prepare(
    creator([
      ["0", "5"],
      ["1", "8"],
      ["2", "4"],
      ["3", "6"],
      // this node could be put in two places, to minimize edge distance, or
      // overall width
      ["6", "7"],
      ["6", "9"],
    ])
  );
  const layout = greedy().bidirectional(true);
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([1, 2, 0, 3, 0, 1, 3, 1, 2, 3]);

  const uncompressed = layout.compressed(false);
  uncompressed(nodes);
  expect(nodes.map((n) => n.x)).toEqual([1, 2, 0, 3, 0, 1, 3, 4, 2, 3]);
});

test("greedy() produces layout for bottom-up bidirectional uncompressed", () => {
  const creator = connect();
  const nodes = prepare(
    creator([
      ["0", "8"],
      ["1", "3"],
      ["2", "3"],
      ["3", "6"],
      ["4", "9"],
      ["5", "7"],
    ])
  );
  const layout = greedy().topDown(false).compressed(false).bidirectional(true);
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([2, 3, 4, 3, 1, 0, 3, 0, 2, 1]);
});

test("greedy() works for unconnected", () => {
  const nodes = prepare(trip());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 0, 0]);
});

test("greedy() has crossings for hard case", () => {
  const nodes = prepare(hard());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((n) => n.x)).toEqual([0, 3, 2, 1, 0]);
  expect(crossings(nodes)).toEqual(2);
});

test("greedy() throws for arguments", () => {
  expect(() => greedy(undefined as never)).toThrow("greedy");
});
