import { connect } from "../../src/dag/create";
import { map } from "../../src/iters";
import { zherebko } from "../../src/zherebko";
import { doub, single } from "../examples";

test("zherebko() works for a point", () => {
  const dag = single();
  const layout = zherebko().nodeSize([2, 2, 2] as const);
  const [nodeWidth, nodeHeight, edgeGap] = layout.nodeSize();
  expect(nodeWidth).toBeCloseTo(2);
  expect(nodeHeight).toBeCloseTo(2);
  expect(edgeGap).toBeCloseTo(2);
  expect(layout.size()).toBeNull();
  const { width, height } = layout(dag);
  expect(width).toEqual(2);
  expect(height).toEqual(2);
  const [root] = dag.iroots();
  expect(root.x).toBeCloseTo(1);
  expect(root.y).toBeCloseTo(1);
});

test("zherebko() works for a line", () => {
  const dag = connect()([["0", "1"]]);
  const layout = zherebko().size([2, 4]);
  expect(layout.size()).toEqual([2, 4]);
  layout(dag);
  const [head, tail] = dag;
  expect(head.x).toBeCloseTo(1);
  expect(head.y).toBeCloseTo(1);
  expect(tail.x).toBeCloseTo(1);
  expect(tail.y).toBeCloseTo(3);
});

test("zherebko() works specific case", () => {
  const dag = connect()([
    ["0", "1"],
    ["0", "2"],
    ["0", "3"],
    ["1", "2"],
    ["2", "3"],
    ["2", "4"],
    ["3", "4"]
  ]);
  const layout = zherebko().nodeSize([2, 2, 2]);
  const { width, height } = layout(dag);
  expect(width).toBeCloseTo(6);
  expect(height).toBeCloseTo(10);
  for (const node of dag) {
    expect(node.x).toBeCloseTo(3);
    expect(node.y).toBeCloseTo(parseInt(node.data.id) * 2 + 1);
  }
  const [zero, , two] = dag.idescendants("before");

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
    expect(point.x).toBeCloseTo(5);
    expect(point.y).toBeCloseTo(3);

    expect(threel.target.data.id).toBe("3");
    expect(threel.points).toHaveLength(4);
    const [, up, down] = threel.points;
    expect(up.x).toBeCloseTo(1);
    expect(up.y).toBeCloseTo(3);
    expect(down.x).toBeCloseTo(1);
    expect(down.y).toBeCloseTo(5);
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
    expect(point.x).toBeCloseTo(5);
    expect(point.y).toBeCloseTo(7);
  }
});

test("zherebko() works on disconnected dag", () => {
  const dag = doub();
  zherebko().nodeSize([2, 2, 2])(dag);
  expect(
    [...map(dag.idescendants(), (n) => n.y!)].sort((a, b) => a - b)
  ).toEqual([1, 3]);
  for (const node of dag) {
    expect(node.x).toEqual(1);
  }
});

test("zherebko() works on sink", () => {
  const dag = connect()([
    ["0", "3"],
    ["1", "3"],
    ["2", "3"]
  ]);
  const layout = zherebko().nodeSize([2, 1, 1]).size([8, 8]);
  layout(dag);
  for (const node of dag) {
    expect(node.x).toEqual(4);
    expect(
      node.data.id === "3" ? node.y === 7 : node.y !== undefined && node.y < 7
    ).toBeTruthy();
    const [{ points = [] } = {}] = node.ichildLinks();
    const exes = new Set(points.slice(1, -1).map(({ x }) => x));
    expect(exes.size).toBeLessThan(2);
    const [x = 1] = exes;
    expect([1, 7]).toContainEqual(x);
  }
});

test("zherebko() fails with args", () => {
  expect(() => zherebko(null as never)).toThrow("got arguments to zherebko");
});
