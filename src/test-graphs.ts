/**
 * example graphs for testing
 *
 * @internal
 * @packageDocumentation
 */
import { Graph } from "./graph";
import { graphConnect } from "./graph/connect";

export type ConnectGraph = Graph<string, [string, string]>;

const connect = graphConnect().single(true);

// single node
// 0
export function single(): ConnectGraph {
  return connect([["0", "0"]]);
}

// two independent nodes
// 0 1
export function doub(): ConnectGraph {
  return connect([
    ["0", "0"],
    ["1", "1"],
  ]);
}

// two connected nodes
// 0
// |
// 1
export function line(): ConnectGraph {
  return connect([["0", "1"]]);
}

// two nodes in a cycle
// 0
// ^\
// |/
// 1
export function oh(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["1", "0"],
  ]);
}

// three independent nodes
// 0 1 2
export function trip(): ConnectGraph {
  return connect([
    ["0", "0"],
    ["1", "1"],
    ["2", "2"],
  ]);
}

// simplest multi-graph
//  0
// / \
// \ /
//  1
export function multi(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["0", "1"],
  ]);
}

// simplest cycle
//  0
// / \
// \ /
//  1
export function cyc(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["1", "0"],
  ]);
}

// multi-graph where no skips should happen
//   0
//  /|\
// | 1 |
//  \|/
//   2
export function eye(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["0", "2"],
    ["0", "2"],
    ["1", "2"],
  ]);
}

// square, simple with a cycle
//   0
//  / \
// 1   2
//  \ /
//   3
export function square(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["0", "2"],
    ["1", "3"],
    ["2", "3"],
  ]);
}

// minimal graph to require a dummy node
// 0
// |\
// | 1
// |/
// 2
export function dummy(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["0", "2"],
    ["1", "2"],
  ]);
}

// minimal graph with at least three in a row both ways
//   0
//  /|\
// 1 2 3
//  \|/
//   4
export function three(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["0", "2"],
    ["0", "3"],
    ["1", "4"],
    ["2", "4"],
    ["3", "4"],
  ]);
}

// simple two source graph shaped like an N
// 0 1
// |\|
// 2 3
export function en(): ConnectGraph {
  return connect([
    ["0", "2"],
    ["0", "3"],
    ["1", "3"],
  ]);
}

// simple graph shaped like an x, requires offset nodes
// 0
// |
// 1   2
//  \ /
//   3
//  / \
// 4   5
//     |
//     6
export function ex(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["1", "3"],
    ["2", "3"],
    ["3", "4"],
    ["3", "5"],
    ["5", "6"],
  ]);
}

// graph from issue #43
// 0   1
// |\  |
// 3 4 2
// |/
// 7   5
//     |
//     6
export function ccoz(): ConnectGraph {
  return connect([
    ["0", "3"],
    ["0", "4"],
    ["1", "2"],
    ["3", "7"],
    ["5", "6"],
    ["4", "7"],
  ]);
}

// zherebko example
export function zhere(): ConnectGraph {
  return connect([
    ["0", "1"],
    ["0", "4"],
    ["0", "6"],
    ["1", "2"],
    ["1", "3"],
    ["1", "4"],
    ["1", "6"],
    ["1", "7"],
    ["2", "5"],
    ["2", "7"],
    ["3", "6"],
    ["4", "6"],
    ["4", "7"],
    ["4", "8"],
    ["5", "7"],
    ["6", "7"],
    ["8", "9"],
    ["8", "10"],
  ]);
}
