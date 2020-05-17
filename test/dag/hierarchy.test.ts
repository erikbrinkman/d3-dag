import { dagHierarchy } from "../../src";

const tail = { id: "d" };
const square = {
  id: "a",
  children: [
    {
      id: "b",
      children: [tail]
    },
    {
      id: "c",
      children: [tail]
    }
  ]
};

test("dagHierarchy() parses minimal dag", () => {
  const single = { id: "a" };

  function empty(): undefined {
    return undefined;
  }

  const layout = dagHierarchy().children(empty);
  expect(layout.children()).toBe(empty);
  expect(layout.childrenData()(single, 0)).toHaveLength(0);
  const dag = layout(single);
  expect(dag.size()).toBeCloseTo(1);
  const [root] = dag.iroots();
  expect(root).toBe(dag);
  expect(root.id).toBe("a");
});

test("dagHierarchy() parses a simple square", () => {
  const dag = dagHierarchy()(square);
  const [root] = dag.iroots();
  expect(root).toBe(dag);
  expect(root.id).toBe("a");
  expect(root.children()).toHaveLength(2);
  const [left, right] = root.ichildren();
  const [leftc] = left.ichildren();
  const [rightc] = right.ichildren();
  expect(leftc).toBe(rightc);
});

test("dagHierarchy() parses simple vee", () => {
  const dag = dagHierarchy()(...square.children);
  expect(dag.size()).toBeCloseTo(3);
  const [left, right] = dag.iroots();
  const [leftc] = left.ichildren();
  const [rightc] = right.ichildren();
  expect(leftc).toBe(rightc);
});

interface ComplexDatum {
  i: string;
  c?: [ComplexDatum, string][];
}

test("dagHierarchy() works with custom operators", () => {
  const t: ComplexDatum = { i: "d" };
  const s: ComplexDatum = {
    i: "a",
    c: [
      [
        {
          i: "b",
          c: [[t, "b -> d"]]
        },
        "a -> b"
      ],
      [
        {
          i: "c",
          c: [[t, "c -> d"]]
        },
        "a -> c"
      ]
    ]
  };

  function newId(d: ComplexDatum): string {
    return d.i;
  }

  function newChildData(d: ComplexDatum): [ComplexDatum, string][] | undefined {
    return d.c;
  }

  const layout = dagHierarchy<ComplexDatum>()
    .id(newId)
    .childrenData(newChildData);
  expect(layout.id()).toBe(newId);
  expect(layout.children().wrapped).toBe(newChildData);
  expect(layout.childrenData()).toBe(newChildData);
  expect(layout.children()(s, 0)).toHaveLength(2);
  expect(layout.children()(t, 4)).toHaveLength(0);

  const dag = layout(s);
  expect(dag.size()).toBeCloseTo(4);
});

test("dagHierarchy() fails with empty data", () => {
  expect(() => dagHierarchy()()).toThrow("must pass in at least one node");
});

test("dagHierarchy() fails without unique ids", () => {
  const line = {
    id: "1",
    children: [
      {
        id: "2",
        children: [
          {
            id: "1"
          }
        ]
      }
    ]
  };
  expect(() => dagHierarchy()(line)).toThrow("duplicate id");
});

test("dagHierarchy() fails with invalid root", () => {
  const input = { id: "1", children: [{ id: "2" }] };
  expect(() => dagHierarchy()(input, ...input.children)).toThrow(
    "node 1 pointed to a root"
  );
});

interface Loop {
  id: string;
  children: Loop[];
}

test("dagHierarchy() fails with cycle", () => {
  const selfLoop: Loop = { id: "2", children: [] };
  selfLoop.children.push(selfLoop);
  const line = {
    id: "1",
    children: [selfLoop]
  };
  expect(() => dagHierarchy()(line)).toThrow("cycle: 2 -> 2");
});

test("dagHierarchy() fails with hard cycle", () => {
  const loop: Loop = {
      id: "3",
      children: [
        {
          id: "4",
          children: []
        }
      ]
    },
    roota = {
      id: "1",
      children: loop.children.slice()
    },
    rootb = {
      id: "2",
      children: [loop]
    };
  loop.children[0].children.push(loop);
  expect(() => dagHierarchy()(roota, rootb)).toThrow("cycle: 4 -> 3 -> 4");
});

test("dagHierarchy() fails with null id", () => {
  expect(() => dagHierarchy()({ id: "\0" })).toThrow(
    "node id \0 contained null character"
  );
});

test("dagHierarchy() throws for nonempty input", () => {
  expect(() => {
    const willFail = (dagHierarchy as unknown) as (x: null) => void;
    willFail(null);
  }).toThrow("got arguments to dagHierarchy");
});

test("dagHierarchy() fails with missing id", () => {
  expect(() => dagHierarchy()({})).toThrow(
    "default id function expected datum to have an id field by got: "
  );
});

test("dagHierarchy() fails with incorrect children", () => {
  expect(() => dagHierarchy()({ id: "a", children: null })).toThrow(
    "default children function expected datum to have a children field but got: "
  );
});

test("dagHierarchy() fails with invalid manual ids", () => {
  expect(() =>
    dagHierarchy().id(() => (null as unknown) as string)({})
  ).toThrow("id is supposed to be string but got type ");
});
