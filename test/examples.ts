import { Dag, DagNode } from "../src/dag/node";

import { dagStratify } from "../src";

export interface SimpleDatum {
  id: string;
  parentIds?: string[];
}

export type SimpleLinkDatum = [string, string];

// single node
// 0
export function single(): Dag<DagNode<SimpleDatum>> {
  return dagStratify<SimpleDatum>()([
    {
      id: "0"
    }
  ]);
}

// two independent nodes
// 0 1
export function doub(): Dag<DagNode<SimpleDatum>> {
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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
  return dagStratify<SimpleDatum>()([
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

// complicated dag that can be used to heuristically evaluate different methods
export function grafo(): Dag<DagNode<SimpleDatum>> {
  return dagStratify<SimpleDatum>()([
    {
      id: "0",
      parentIds: ["8"]
    },
    {
      id: "1"
    },
    {
      id: "2"
    },
    {
      id: "3",
      parentIds: ["11"]
    },
    {
      id: "4",
      parentIds: ["12"]
    },
    {
      id: "5",
      parentIds: ["18"]
    },
    {
      id: "6",
      parentIds: ["9", "15", "17"]
    },
    {
      id: "7",
      parentIds: ["3", "17", "20", "21"]
    },
    {
      id: "8"
    },
    {
      id: "9",
      parentIds: ["4"]
    },
    {
      id: "10",
      parentIds: ["16", "21"]
    },
    {
      id: "11",
      parentIds: ["2"]
    },
    {
      id: "12",
      parentIds: ["21"]
    },
    {
      id: "13",
      parentIds: ["4", "12"]
    },
    {
      id: "14",
      parentIds: ["1", "8"]
    },
    {
      id: "15"
    },
    {
      id: "16",
      parentIds: ["0"]
    },
    {
      id: "17",
      parentIds: ["19"]
    },
    {
      id: "18",
      parentIds: ["9"]
    },
    {
      id: "19"
    },
    {
      id: "20",
      parentIds: ["13"]
    },
    {
      id: "21"
    }
  ]);
}

// graph used in testing by arquint
//   0
//  /|\
// 1 2 4
// |/  |
// 3   5
export function arq(): Dag<DagNode<SimpleDatum>> {
  return dagStratify<SimpleDatum>()([
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
    },
    {
      id: "4",
      parentIds: ["0"]
    },
    {
      id: "5",
      parentIds: ["4"]
    }
  ]);
}
