import { expect, test } from "bun:test";
import { graphConnect } from "../../graph/connect.js";
import { dummy, en, ex, three, trip } from "../../test-graphs.js";
import { laneGreedy as greedy } from "./greedy.js";
import { crossings, hard, prepare } from "./test-utils.js";

test("greedy() works for triangle", () => {
  const nodes = prepare(dummy());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 1, 0]);
});

test("greedy() works for triangle bottom-up", () => {
  const nodes = prepare(dummy());
  const layout = greedy().topDown(false);
  expect(layout.topDown()).toBe(false);
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 1, 0]);
});

test("greedy() works for ex", () => {
  const nodes = prepare(ex());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 0, 1, 0, 1, 0, 0]);
});

test("greedy() compresses single directionally", () => {
  const creator = graphConnect();
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
    ]),
  );
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 1, 2, 3, 1, 3, 1, 3, 2, 0]);

  // clear history
  for (const node of nodes) {
    node.ux = undefined;
  }

  const uncompressed = layout.compressed(false);
  expect(uncompressed.compressed()).toBe(false);
  uncompressed(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 1, 2, 3, 1, 3, 4, 3, 2, 0]);
});

test("greedy() bidirectionalizes en", () => {
  const nodes = prepare(en());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 2, 1, 0]);

  // clear history
  for (const node of nodes) {
    node.ux = undefined;
  }

  const bidirec = layout.bidirectional(true);
  expect(bidirec.bidirectional()).toBe(true);
  bidirec(nodes);
  expect(nodes.map((node) => node.x)).toEqual([1, 0, 2, 1]);
});

test("greedy() bidirectionalizes three", () => {
  const nodes = prepare(three());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 2, 1, 0, 2]);

  // clear history
  for (const node of nodes) {
    node.ux = undefined;
  }

  const bidirec = layout.bidirectional(true);
  bidirec(nodes);
  expect(nodes.map((node) => node.x)).toEqual([1, 0, 2, 1, 0]);
});

test("greedy() compresses bidirectionally", () => {
  const creator = graphConnect();
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
    ]),
  );
  const layout = greedy().bidirectional(true);
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([1, 2, 0, 3, 0, 1, 3, 1, 2, 3]);

  // clear history
  for (const node of nodes) {
    node.ux = undefined;
  }

  const uncompressed = layout.compressed(false);
  uncompressed(nodes);
  expect(nodes.map((node) => node.x)).toEqual([1, 2, 0, 3, 0, 1, 3, 4, 2, 3]);
});

test("greedy() produces layout for bottom-up bidirectional uncompressed", () => {
  const creator = graphConnect();
  const nodes = prepare(
    creator([
      ["0", "8"],
      ["1", "3"],
      ["2", "3"],
      ["3", "6"],
      ["4", "9"],
      ["5", "7"],
    ]),
  );
  const layout = greedy().topDown(false).compressed(false).bidirectional(true);
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([2, 3, 4, 3, 1, 0, 3, 0, 2, 1]);
});

test("greedy() works for unconnected", () => {
  const nodes = prepare(trip());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 0, 0]);
});

test("greedy() has crossings for hard case", () => {
  const nodes = prepare(hard());
  const layout = greedy();
  layout(nodes);
  expect(nodes.map((node) => node.x)).toEqual([0, 3, 2, 1, 0]);
  expect(crossings(nodes)).toEqual(2);
});

test("greedy() throws for arguments", () => {
  // @ts-expect-error no args
  expect(() => greedy(null)).toThrow("laneGreedy()");
});

test("greedy() picks the nearest lane past ten lanes", () => {
  const nodes = prepare(
    graphConnect()([
      ["0", "12"],
      ["0", "14"],
      ["1", "9"],
      ["2", "4"],
      ["2", "6"],
      ["2", "7"],
      ["2", "9"],
      ["2", "16"],
      ["2", "20"],
      ["3", "4"],
      ["3", "10"],
      ["3", "14"],
      ["4", "17"],
      ["5", "13"],
      ["5", "14"],
      ["5", "17"],
      ["5", "19"],
      ["8", "11"],
      ["8", "15"],
      ["9", "11"],
      ["9", "15"],
      ["9", "17"],
      ["10", "14"],
      ["10", "18"],
      ["11", "17"],
      ["11", "18"],
      ["12", "18"],
      ["13", "19"],
      ["18", "19"],
    ]),
  );
  greedy().compressed(false)(nodes);
  expect(nodes.map((node) => node.x)).toEqual([
    0, 2, 3, 8, 7, 9, 6, 5, 5, 2, 8, 6, 1, 10, 0, 5, 4, 7, 8, 9, 3,
  ]);
});

test("greedy() picks the nearest lane past ten lanes bidirectionally", () => {
  const nodes = prepare(
    graphConnect()([
      ["0", "1"],
      ["0", "2"],
      ["0", "8"],
      ["1", "8"],
      ["1", "21"],
      ["2", "13"],
      ["2", "14"],
      ["2", "19"],
      ["3", "5"],
      ["3", "10"],
      ["3", "14"],
      ["4", "9"],
      ["4", "13"],
      ["4", "15"],
      ["4", "19"],
      ["4", "20"],
      ["5", "6"],
      ["5", "8"],
      ["5", "16"],
      ["5", "21"],
      ["5", "22"],
      ["7", "15"],
      ["7", "18"],
      ["8", "9"],
      ["8", "11"],
      ["9", "13"],
      ["9", "16"],
      ["9", "18"],
      ["10", "12"],
      ["10", "19"],
      ["11", "12"],
      ["12", "22"],
      ["13", "14"],
      ["13", "16"],
      ["13", "19"],
      ["14", "16"],
      ["14", "19"],
      ["14", "22"],
      ["14", "23"],
      ["15", "17"],
      ["15", "23"],
      ["16", "20"],
      ["16", "21"],
      ["18", "20"],
      ["19", "20"],
    ]),
  );
  greedy().compressed(false).bidirectional(true)(nodes);
  expect(nodes.map((node) => node.x)).toEqual([
    5, 4, 6, 3, 9, 2, 0, 0, 5, 11, 3, 5, 3, 8, 7, 10, 1, 10, 0, 6, 9, 4, 2, 7,
  ]);
});
