export interface SimpleDatum {
  id: string;
  parentIds?: string[];
}

export type SimpleLinkDatum = [string, string];

// single node
// 0
export const single: SimpleDatum[] = [
  {
    id: "0"
  }
];

// two independent nodes
// 0 1
export const doub: SimpleDatum[] = [
  {
    id: "0"
  },
  {
    id: "1"
  }
];

// square, simple with a cycle
//   0
//  / \
// 1   2
//  \ /
//   3
export const square: SimpleDatum[] = [
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
];

// minimal dag to require a dummy node
// 0
// |\
// | 1
// |/
// 2
export const dummy: SimpleDatum[] = [
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
];

// minimal dag with at least three in a row both ways
//   0
//  /|\
// 1 2 3
//  \|/
//   4
export const three: SimpleDatum[] = [
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
];

// simple two soruce dag shaped like an N
// 0 1
// |\|
// 2 3
export const en: SimpleDatum[] = [
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
];

// simple V shape
// 0   1
//  \ /
//   2
export const vee: SimpleDatum[] = [
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
];

// simple W shape
// 0   1   2
//  \ / \ /
//   3   4
export const doubleYou: SimpleDatum[] = [
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
];

// two independent Vs
// 0   1   2   3
//  \ /     \ /
//   4       5
export const doubleVee: SimpleDatum[] = [
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
];

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
export const ex: SimpleDatum[] = [
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
];

// complicated dag that can be used to heuristically evaluate different methods
export const grafo: SimpleDatum[] = [
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
];

// example graph orvided by zhereboko
export const zherebko: SimpleLinkDatum[] = [
  ["1", "2"],
  ["1", "5"],
  ["1", "7"],
  ["2", "3"],
  ["2", "4"],
  ["2", "5"],
  ["2", "7"],
  ["2", "8"],
  ["3", "6"],
  ["3", "8"],
  ["4", "7"],
  ["5", "7"],
  ["5", "8"],
  ["5", "9"],
  ["6", "8"],
  ["7", "8"],
  ["9", "10"],
  ["9", "11"]
];

// graph used in testing by arquint
//   0
//  /|\
// 1 2 4
// |/  |
// 3   5
export const arq: SimpleDatum[] = [
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
];
