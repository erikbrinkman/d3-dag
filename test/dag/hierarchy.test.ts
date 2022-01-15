import { hierarchy } from "../../src/dag/create";

const tail = { id: "d", children: [] } as const;
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
} as const;

interface SimpleDatum {
  readonly id: string;
  readonly children?: readonly SimpleDatum[];
}

function typedChildren(datum: SimpleDatum): readonly SimpleDatum[] | undefined {
  return datum.children;
}

test("hierarchy() parses minimal dag", () => {
  const single = { id: "a" };

  const layout = hierarchy().children(typedChildren);
  expect(layout.children()).toBe(typedChildren);
  expect(layout.childrenData()(single, 0)).toHaveLength(0);
  const dag = layout(single);
  expect(dag.size()).toBeCloseTo(1);
  const [root] = dag.iroots();
  expect(root).toBe(dag);
  expect(root.data.id).toBe("a");
});

test("hierarchy() parses a simple square", () => {
  const dag = hierarchy().children(typedChildren)(square);
  const [root] = dag.iroots();
  expect(root).toBe(dag);
  expect(root.data.id).toBe("a");
  expect(root.children()).toHaveLength(2);
  const [left, right] = root.ichildren();
  const [leftc] = left.ichildren();
  const [rightc] = right.ichildren();
  expect(leftc).toBe(rightc);
});

test("hierarchy() parses simple v", () => {
  const dag = hierarchy()(...square.children);
  expect(dag.size()).toBeCloseTo(3);
  const [left, right] = dag.iroots();
  const [leftc] = left.ichildren();
  const [rightc] = right.ichildren();
  expect(leftc).toBe(rightc);
});

interface ComplexDatum {
  c?: [ComplexDatum, string][];
}

test("hierarchy() works with custom operators", () => {
  const t: ComplexDatum = {};
  const s: ComplexDatum = {
    c: [
      [
        {
          c: [[t, "b -> d"]]
        },
        "a -> b"
      ],
      [
        {
          c: [[t, "c -> d"]]
        },
        "a -> c"
      ]
    ]
  };

  function newChildData({
    c
  }: ComplexDatum): readonly (readonly [ComplexDatum, string])[] | undefined {
    return c;
  }

  const layout = hierarchy().childrenData(newChildData);
  expect(layout.children().wrapped).toBe(newChildData);
  expect(layout.childrenData()).toBe(newChildData);
  expect(layout.children()(s, 0)).toHaveLength(2);
  expect(layout.children()(t, 4)).toHaveLength(0);

  const dag = layout(s);
  expect(dag.size()).toBeCloseTo(4);
});

test("hierarchy() fails with empty data", () => {
  expect(() => hierarchy()()).toThrow("must pass in at least one node");
});

test("hierarchy() fails with invalid root", () => {
  const input = {
    id: "1",
    children: [{ id: "2", children: undefined }]
  } as const;
  expect(() => hierarchy()(input, ...input.children)).toThrow(
    /node '{"id":"1",.*}' pointed to a root/
  );
});

test("hierarchy() passes with invalid root and roots", () => {
  const input = {
    id: "1",
    children: [{ id: "2", children: undefined }]
  } as const;
  const layout = hierarchy().roots(false);
  expect(layout.roots()).toBeFalsy();
  layout(input, ...input.children);
});

interface Loop {
  id: string;
  children: Loop[];
}

test("hierarchy() detects cycle with invalid roots", () => {
  const input: Loop = { id: "1", children: [{ id: "2", children: [] }] };
  input.children[0].children.push(input);
  const layout = hierarchy().roots(false);
  expect(() => layout(input)).toThrow(
    /cycle: '{.*"id":"1".*}' -> '{.*"id":"2".*}' -> '{.*"id":"1".*}'/
  );
});

test("hierarchy() fails with cycle", () => {
  const selfLoop: Loop = { id: "2", children: [] };
  selfLoop.children.push(selfLoop);
  const line = {
    id: "1",
    children: [selfLoop]
  };
  expect(() => hierarchy()(line)).toThrow(
    /cycle: '{.*"id":"2".*}' -> '{.*"id":"2".*}'/
  );
});

test("hierarchy() fails with hard cycle", () => {
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
  expect(() => hierarchy()(roota, rootb)).toThrow(
    /cycle: '{"id":"4",.*}' -> '{"id":"3",.*}' -> '{"id":"4",.*}'/
  );
});

test("hierarchy() throws for nonempty input", () => {
  expect(() => {
    hierarchy(null as never);
  }).toThrow("got arguments to hierarchy");
});

class BadChildren {
  get children(): undefined {
    throw new Error("bad children");
  }
}

test("hierarchy() fails with incorrect children", () => {
  expect(() => hierarchy()(new BadChildren())).toThrow(
    "default children function expected datum to have a children field but got: "
  );
});
