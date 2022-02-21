import { stratify } from "../../src/dag/create";
import { SimpleDatum } from "../examples";

const single = [
  {
    id: "0"
  }
] as const;
const doub = [
  {
    id: "0"
  },
  {
    id: "1"
  }
] as const;
const square = [
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
] as const;
const spaces = [
  {
    id: "0 0"
  },
  {
    id: "1 1",
    parentIds: ["0 0"]
  }
] as const;

function alter(id: string): string {
  return `a${id}`;
}

test("stratify() parses minimal dag", () => {
  const dag = stratify()(single);
  const [node] = dag;
  expect(node.data.id).toBe("0");
  expect(node.children()).toHaveLength(0);
});

test("stratify() parses multi-root dag", () => {
  const dag = stratify()(doub);
  const ids = dag
    .descendants()
    .map((d) => d.data.id)
    .sort();
  expect(ids).toEqual(["0", "1"]);
});

test("stratify() parses ids with spaces", () => {
  const dag = stratify()(spaces);
  const ids = dag.descendants().map((d) => d.data.id);
  expect(ids).toEqual(["0 0", "1 1"]);
});

test("stratify() parses a square", () => {
  const dag = stratify()(square);
  const [root] = dag.iroots();
  expect(root.data.id).toBe("0");
  expect(root.children()).toHaveLength(2);
  const [left, right] = root.ichildren();
  expect(left.children()[0]).toBe(right.children()[0]);
});

test("stratify() parses a square with altered ids", () => {
  function newId(d: SimpleDatum): string {
    return alter(d.id);
  }
  function newParentIds(d: SimpleDatum): readonly string[] {
    return (d.parentIds || []).map(alter);
  }
  const layout = stratify().id(newId).parentIds(newParentIds);
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

test("stratify() works with data accessor", () => {
  const complexSquare = [
    { i: "a", pd: undefined },
    { i: "b", pd: [["a", "a -> b"]] },
    { i: "c", pd: [["a", "a -> c"]] },
    {
      i: "d",
      pd: [
        ["b", "b -> d"],
        ["c", "c -> d"]
      ]
    }
  ] as const;

  const newId = ({ i }: { i: string }) => i;
  const newParentData = ({
    pd
  }: {
    pd: readonly (readonly [string, string])[] | undefined;
  }) => pd;

  const layout = stratify().id(newId).parentData(newParentData);
  expect(layout.id()).toBe(newId);
  expect(layout.parentData()).toBe(newParentData);
  expect(layout.parentIds().wrapped).toBe(newParentData);

  // check that wrapper works
  const justIds = layout.parentIds();
  for (const data of complexSquare) {
    expect((justIds(data, 0) || []).slice().sort()).toEqual(
      (data.pd || []).map(([id]: readonly [string, string]) => id).sort()
    );
  }

  const dag = layout(complexSquare);
  const [root] = dag.descendants().filter((n) => n.data.i === "a");
  expect(root.data.i).toBe("a");
  expect(root.children()).toHaveLength(2);
  const [left, right] = root.ichildren();
  expect(left.children()[0]).toBe(right.children()[0]);
});

test("stratify() decycle works with cycle", () => {
  const data = [
    {
      id: "1",
      parentIds: ["3"]
    },
    {
      id: "2",
      parentIds: ["1"]
    },
    {
      id: "3",
      parentIds: ["2"]
    }
  ];
  const layout = stratify().decycle(true);
  expect(layout.decycle()).toBe(true);
  const dag = layout(data);
  expect(dag.size()).toBe(3);
});

test("stratify() fails with arguments", () => {
  expect(() => stratify(undefined as never)).toThrow(
    "got arguments to stratify"
  );
});

test("stratify() fails with empty data", () => {
  expect(() => stratify()([])).toThrow("can't stratify empty data");
});

class BadId {
  get id(): string {
    throw new Error("bad id");
  }
}
test("stratify() fails at undefined id", () => {
  expect(() => {
    stratify()([{ id: null as unknown as string }]);
  }).toThrow("default id function expected datum to have an id field but got");
  expect(() => {
    stratify()([new BadId()]);
  }).toThrow("default id function expected datum to have an id field but got");
});

test("stratify() fails without unique ids", () => {
  const data = [
    { id: "1", parentIds: [] },
    { id: "1", parentIds: [] }
  ];
  expect(() => stratify()(data)).toThrow("duplicate id");
});

test("stratify() fails with missing id", () => {
  const data = [{ id: "1", parentIds: ["2"] }];
  expect(() => stratify()(data)).toThrow("missing id");
});

test("stratify() fails without root", () => {
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
  expect(() => stratify()(data)).toThrow("no roots");
});

test("stratify() fails with self loop", () => {
  const data = [
    {
      id: "1"
    },
    {
      id: "2",
      parentIds: ["1", "2"]
    }
  ];
  expect(() => stratify()(data)).toThrow(
    /node '{"id":"2",.*}' contained a self loop/
  );
});

test("stratify() fails with cycle", () => {
  const data = [
    {
      id: "1"
    },
    {
      id: "2",
      parentIds: ["1", "3"]
    },
    {
      id: "3",
      parentIds: ["2"]
    }
  ];
  expect(() => stratify()(data)).toThrow(
    /cycle: '{"id":"2",.*}' -> '{"id":"3",.*}' -> '{"id":"2",.*}'/
  );
});

test("stratify() fails with hard cycle", () => {
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
  expect(() => stratify()(data)).toThrow(
    /cycle: '{"id":"4",.*}' -> '{"id":"3",.*}' -> '{"id":"4".*}'/
  );
});

test("stratify() fails with invalid id type", () => {
  const id: unknown = () => null;
  expect(() =>
    stratify().id(id as (_: unknown) => string)([{ parentIds: [] }])
  ).toThrow("id is supposed to be string but got type object");
});

class BadParentIds {
  id = "";
  get parentIds(): undefined {
    throw new Error("bad parent ids");
  }
}

test("stratify() fails with incorrect parentIds", () => {
  const data = [
    {
      id: "1",
      parentIds: null as unknown as undefined
    }
  ];
  expect(() => stratify()(data)).toThrow(
    "default parentIds function expected datum to have a parentIds field but got: "
  );
  expect(() => stratify()([new BadParentIds()])).toThrow(
    "default parentIds function expected datum to have a parentIds field but got: "
  );
});
