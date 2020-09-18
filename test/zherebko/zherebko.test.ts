import { dagConnect, zherebko } from "../../src";
import { doub, single } from "../examples";

test("zherebko() works for a point", () => {
  const dag = single();
  const layout = zherebko().size([2, 2]);
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
    expect(node.y).toBeCloseTo(parseFloat(node.id) / 4);
  }
  const [zero, , two] = laidout.idescendants("before");

  {
    expect(zero.id).toBe("0");
    const [onel, twol, threel] = zero
      .childLinks()
      .sort((a, b) => parseInt(a.target.id) - parseInt(b.target.id));

    expect(onel.target.id).toBe("1");
    expect(onel.points).toHaveLength(2);

    expect(twol.target.id).toBe("2");
    expect(twol.points).toHaveLength(3);
    const [, point] = twol.points;
    expect(point.x).toBeCloseTo(1.0);
    expect(point.y).toBeCloseTo(0.25);

    expect(threel.target.id).toBe("3");
    expect(threel.points).toHaveLength(4);
    const [, up, down] = threel.points;
    expect(up.x).toBeCloseTo(0.0);
    expect(up.y).toBeCloseTo(0.25);
    expect(down.x).toBeCloseTo(0.0);
    expect(down.y).toBeCloseTo(0.5);
  }

  {
    expect(two.id).toBe("2");
    const [threel, fourl] = two
      .childLinks()
      .sort((a, b) => parseInt(a.target.id) - parseInt(b.target.id));

    expect(threel.target.id).toBe("3");
    expect(threel.points).toHaveLength(2);

    expect(fourl.target.id).toBe("4");
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

test("zherebko() fails with args", () => {
  const fail = (zherebko as unknown) as (x: null) => void;
  expect(() => fail(null)).toThrow("got arguments to zherebko");
});
