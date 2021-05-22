import { Dag, DagNode } from "../src/dag/node";
import { dagConnect, dagStratify } from "../src";

import { ConnectDatum } from "../src/dag/connect";

export interface SimpleDatum {
  readonly id: string;
  readonly parentIds?: readonly string[];
}

export type SimpleLinkDatum = [string, string];

// single node
// 0
export function single(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    }
  ]);
}

// two independent nodes
// 0 1
export function doub(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1"
    }
  ]);
}

// three independent nodes
// 0 1 2
export function trip(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1"
    },
    {
      id: "2"
    }
  ]);
}

// square, simple with a cycle
//   0
//  / \
// 1   2
//  \ /
//   3
export function square(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1",
      parentIds: ["0"]
    },
    {
      id: "2",
      parentIds: ["0"]
    },
    {
      id: "3",
      parentIds: ["1", "2"]
    }
  ]);
}

// minimal dag to require a dummy node
// 0
// |\
// | 1
// |/
// 2
export function dummy(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1",
      parentIds: ["0"]
    },
    {
      id: "2",
      parentIds: ["0", "1"]
    }
  ]);
}

// minimal dag with at least three in a row both ways
//   0
//  /|\
// 1 2 3
//  \|/
//   4
export function three(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1",
      parentIds: ["0"]
    },
    {
      id: "2",
      parentIds: ["0"]
    },
    {
      id: "3",
      parentIds: ["0"]
    },
    {
      id: "4",
      parentIds: ["1", "2", "3"]
    }
  ]);
}

// simple two soruce dag shaped like an N
// 0 1
// |\|
// 2 3
export function en(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1"
    },
    {
      id: "2",
      parentIds: ["0"]
    },
    {
      id: "3",
      parentIds: ["0", "1"]
    }
  ]);
}

// simple V shape
// 0   1
//  \ /
//   2
export function vee(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1"
    },
    {
      id: "2",
      parentIds: ["0", "1"]
    }
  ]);
}

// simple W shape
// 0   1   2
//  \ / \ /
//   3   4
export function doubleYou(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1"
    },
    {
      id: "2"
    },
    {
      id: "3",
      parentIds: ["0", "1"]
    },
    {
      id: "4",
      parentIds: ["1", "2"]
    }
  ]);
}

// two independent Vs
// 0   1   2   3
//  \ /     \ /
//   4       5
export function doubleVee(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1"
    },
    {
      id: "2"
    },
    {
      id: "3"
    },
    {
      id: "4",
      parentIds: ["0", "1"]
    },
    {
      id: "5",
      parentIds: ["2", "3"]
    }
  ]);
}

// simple dag shaped liek an x, requires offset nodes
// 0
// |
// 1   2
//  \ /
//   3
//  / \
// 4   5
//     |
//     6
export function ex(): Dag<DagNode<SimpleDatum>> {
  return dagStratify()([
    {
      id: "0"
    },
    {
      id: "1",
      parentIds: ["0"]
    },
    {
      id: "2"
    },
    {
      id: "3",
      parentIds: ["1", "2"]
    },
    {
      id: "4",
      parentIds: ["3"]
    },
    {
      id: "5",
      parentIds: ["3"]
    },
    {
      id: "6",
      parentIds: ["5"]
    }
  ]);
}

// dag from issue #43
// 0   1
// |\  |
// 3 7 2
// |/
// 4   5
//     |
//     6
export function ccoz(): Dag<DagNode<ConnectDatum, SimpleLinkDatum>> {
  return dagConnect()([
    ["0", "3"],
    ["0", "7"],
    ["1", "2"],
    ["3", "4"],
    ["5", "6"],
    ["7", "4"]
  ]);
}
