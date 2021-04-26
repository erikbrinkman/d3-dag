import { SimpleDatum } from "../examples";
import { dagStratify } from "../../src/";

const single: SimpleDatum[] = [
  {
    id: "0"
  }
];
const doub: SimpleDatum[] = [
  {
    id: "0"
  },
  {
    id: "1"
  }
];
const square: SimpleDatum[] = [
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
const spaces: SimpleDatum[] = [
  {
    id: "0 0"
  },
  {
    id: "1 1",
    parentIds: ["0 0"]
  }
];

function alter(id: string): string {
  return `a${id}`;
}

test("dagStratify() parses minimal dag", () => {
  const dag = dagStratify()(single);
  const [node] = dag;
  expect(node.data.id).toBe("0");
  expect(node.children()).toHaveLength(0);
});

test("dagStratify() parses multi-root dag", () => {
  const dag = dagStratify()(doub);
  const ids = dag
    .descendants()
    .map((d) => d.data.id)
    .sort();
  expect(ids).toEqual(["0", "1"]);
});

test("dagStratify() parses ids with spaces", () => {
  const dag = dagStratify()(spaces);
  const ids = dag.descendants().map((d) => d.data.id);
  expect(ids).toEqual(["0 0", "1 1"]);
});

test("dagStratify() parses a square", () => {
  const dag = dagStratify()(square);
  const [root] = dag.iroots();
  expect(root.data.id).toBe("0");
  expect(root.children()).toHaveLength(2);
  const [left, right] = root.ichildren();
  expect(left.children()[0]).toBe(right.children()[0]);
});

test("dagStratify() parses a square with altered ids", () => {
  function newId(d: SimpleDatum): string {
    return alter(d.id);
  }
  function newParentIds(d: SimpleDatum): string[] {
    return (d.parentIds || []).map(alter);
  }
  const layout = dagStratify<SimpleDatum>().id(newId).parentIds(newParentIds);
  expect(layout.id()).toBe(newId);
  expect(layout.parentIds()).toBe(newParentIds);
  expect(layout.parentData().wrapped).toBe(newParentIds);
  const dag = layout(square);
  const [root] = dag.iroots();
  expect(root.data.id).toBe("0");
  expect(root.children()).toHaveLength(2);
  const [left, right] = root.ichildren();
  expect(left.children()[0]).toBe(right.children()[0]);
});

test("dagStratify() works with data accessor", () => {
  function newParentData(d: SimpleDatum): [string, string][] | undefined {
    // NOTE this is a poor implementation, but it gets edge cases
    if (d.parentIds === undefined) {
      return undefined;
    } else {
      return d.parentIds.map((pid) => [pid, `${d.id} -> ${pid}`]);
    }
  }
  const layout = dagStratify<SimpleDatum>().parentData(newParentData);
  expect(layout.parentData()).toBe(newParentData);
  expect(layout.parentIds().wrapped).toBe(newParentData);
  const justIds = layout.parentIds();
  for (const data of square) {
    expect(justIds(data, 0).sort()).toEqual(
      (data.parentIds || []).slice().sort()
    );
  }

  const dag = layout(square);
  const [root] = dag.descendants().filter((n) => n.data.id === "0");
  expect(root.data.id).toBe("0");
  expect(root.children()).toHaveLength(2);
  const [left, right] = root.ichildren();
  expect(left.children()[0]).toBe(right.children()[0]);
});

test("dagStratify() fails with arguments", () => {
  // @ts-expect-error stratify takes no arguments
  expect(() => dagStratify(undefined)).toThrow("got arguments to dagStratify");
});

test("dagStratify() fails with empty data", () => {
  expect(() => dagStratify()([])).toThrow("can't stratify empty data");
});

class BadId {
  get id() {
    throw new Error("bad id");
  }
}
test("dagStratify() fails at undefined id", () => {
  expect(() => {
    dagStratify()([{}]);
  }).toThrow("default id function expected datum to have an id field but got");
  expect(() => {
    dagStratify()([new BadId()]);
  }).toThrow("default id function expected datum to have an id field but got");
});

test("dagStratify() fails without unique ids", () => {
  const data = [
    { id: "1", parentIds: [] },
    { id: "1", parentIds: [] }
  ];
  expect(() => dagStratify()(data)).toThrow("duplicate id");
});

test("dagStratify() fails with missing id", () => {
  const data = [{ id: "1", parentIds: ["2"] }];
  expect(() => dagStratify()(data)).toThrow("missing id");
});

test("dagStratify() fails without root", () => {
  const data = [
    {
      id: "1",
      parentIds: ["2"]
    },
    {
      id: "2",
      parentIds: ["1"]
    }
  ];
  expect(() => dagStratify()(data)).toThrow("no roots");
});

test("dagStratify() fails with cycle", () => {
  const data = [
    {
      id: "1"
    },
    {
      id: "2",
      parentIds: ["1", "2"]
    }
  ];
  expect(() => dagStratify()(data)).toThrow(
    /cycle: '{"id":"2",.*}' -> '{"id":"2",.*}'/
  );
});

test("dagStratify() fails with hard cycle", () => {
  const data = [
    {
      id: "1"
    },
    {
      id: "2"
    },
    {
      id: "3",
      parentIds: ["4", "2"]
    },
    {
      id: "4",
      parentIds: ["1", "3"]
    }
  ];
  expect(() => dagStratify()(data)).toThrow(
    /cycle: '{"id":"4",.*}' -> '{"id":"3",.*}' -> '{"id":"4".*}'/
  );
});

test("dagStratify() fails with invalid id type", () => {
  expect(() =>
    dagStratify().id(() => (null as unknown) as string)([null])
  ).toThrow("id is supposed to be string but got type object");
});

class BadParentIds {
  id = "";
  get parentIds() {
    throw new Error("bad parent ids");
  }
}

test("dagStratify() fails with incorrect parentIds", () => {
  const data = [
    {
      id: "1",
      parentIds: null
    }
  ];
  expect(() => dagStratify()(data)).toThrow(
    "default parentIds function expected datum to have a parentIds field but got: "
  );
  expect(() => dagStratify()([new BadParentIds()])).toThrow(
    "default parentIds function expected datum to have a parentIds field but got: "
  );
});
