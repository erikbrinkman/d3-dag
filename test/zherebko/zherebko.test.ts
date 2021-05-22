import { dagConnect, zherebko } from "../../src";
import { doub, single } from "../examples";

test("zherebko() works for a point", () => {
  const dag = single();
  const layout = zherebko().size([2, 2] as const);
  const [width, height] = layout.size();
  expect(width).toBeCloseTo(2);
  expect(height).toBeCloseTo(2);
  const laidout = layout(dag);
  const [root] = laidout.iroots();
  expect(root.x).toBeCloseTo(1);
  expect(root.y).toBeCloseTo(1);
});

test("zherebko() works for a line", () => {
  const dag = dagConnect()([["0", "1"]]);
  const [head, tail] = zherebko()(dag);
  expect(head.x).toBeCloseTo(0.5);
  expect(head.y).toBeCloseTo(0.0);
  expect(tail.x).toBeCloseTo(0.5);
  expect(tail.y).toBeCloseTo(1.0);
});

test("zherebko() works specific case", () => {
  const dag = dagConnect()([
    ["0", "1"],
    ["0", "2"],
    ["0", "3"],
    ["1", "2"],
    ["2", "3"],
    ["2", "4"],
    ["3", "4"]
  ]);
  const laidout = zherebko()(dag);
  for (const node of laidout) {
    expect(node.x).toBeCloseTo(0.5);
    expect(node.y).toBeCloseTo(parseFloat(node.data.id) / 4);
  }
  const [zero, , two] = laidout.idescendants("before");

  {
    expect(zero.data.id).toBe("0");
    const [onel, twol, threel] = zero
      .childLinks()
      .sort((a, b) => parseInt(a.target.data.id) - parseInt(b.target.data.id));

    expect(onel.target.data.id).toBe("1");
    expect(onel.points).toHaveLength(2);

    expect(twol.target.data.id).toBe("2");
    expect(twol.points).toHaveLength(3);
    const [, point] = twol.points;
    expect(point.x).toBeCloseTo(1.0);
    expect(point.y).toBeCloseTo(0.25);

    expect(threel.target.data.id).toBe("3");
    expect(threel.points).toHaveLength(4);
    const [, up, down] = threel.points;
    expect(up.x).toBeCloseTo(0.0);
    expect(up.y).toBeCloseTo(0.25);
    expect(down.x).toBeCloseTo(0.0);
    expect(down.y).toBeCloseTo(0.5);
  }

  {
    expect(two.data.id).toBe("2");
    const [threel, fourl] = two
      .childLinks()
      .sort((a, b) => parseInt(a.target.data.id) - parseInt(b.target.data.id));

    expect(threel.target.data.id).toBe("3");
    expect(threel.points).toHaveLength(2);

    expect(fourl.target.data.id).toBe("4");
    expect(fourl.points).toHaveLength(3);
    const [, point] = fourl.points;
    expect(point.x).toBeCloseTo(1.0);
    expect(point.y).toBeCloseTo(0.75);
  }
});

test("zherebko() works on disconnected dag", () => {
  const dag = doub();
  const laidout = zherebko().size([2, 2])(dag);
  expect([
    ...laidout
      .idescendants()
      .map((n) => n.y)
      .sort()
  ]).toEqual([0, 2]);
  for (const node of laidout) {
    expect(node.x).toEqual(1);
  }
});

test("zherebko() works on sink", () => {
  const dag = dagConnect()([
    ["0", "3"],
    ["1", "3"],
    ["2", "3"]
  ]);
  const laidout = zherebko().size([2, 3])(dag);
  for (const node of laidout) {
    expect(node.x).toEqual(1);
    expect(node.data.id === "3" ? node.y === 3 : node.y < 3).toBeTruthy();
    const [{ points = [] } = {}] = node.ichildLinks();
    const exes = new Set(points.slice(1, -1).map(({ x }) => x));
    expect(exes.size).toBeLessThan(2);
    const [x = 0] = exes;
    expect([0, 2]).toContainEqual(x);
  }
});

test("zherebko() fails with args", () => {
  // @ts-expect-error zherebko takes no arguments
  expect(() => zherebko(undefined)).toThrow("got arguments to zherebko");
});
