import { DagNode } from "../../src/dag";
import { grid } from "../../src/grid";
import { greedy } from "../../src/grid/lane/greedy";
import { dummy, zhere } from "../examples";

test("greedy() works for triangle", () => {
  const dag = dummy();
  const layout = grid().nodeSize([2, 2] as const);
  expect(layout.nodeSize()).toEqual([2, 2]);
  expect(layout.size()).toBeNull();
  const { width, height } = layout(dag);
  expect(width).toEqual(4);
  expect(height).toEqual(6);
  const nodes = [...dag].sort(
    (a, b) => parseInt(a.data.id) - parseInt(b.data.id)
  );
  expect(nodes.map((n) => n.y)).toEqual([1, 3, 5]);
  expect(nodes.map((n) => n.x)).toEqual([1, 3, 1]);
});

test("greedy() works for zherebko", () => {
  const dag = zhere();
  const lane = greedy().topDown(false);
  const layout = grid().nodeSize([2, 2]).size([10, 12]).lane(lane);
  expect(layout.size()).toEqual([10, 12]);
  expect(layout.lane()).toBe(lane);
  // test that layout doesn't throw
  const { width, height } = layout(dag);
  expect(width).toEqual(10);
  expect(height).toEqual(12);
});

test("grid() throws for invalid lane operators", () => {
  const dag = dummy();

  const missing = grid().lane(() => undefined);
  expect(() => missing(dag)).toThrow("didn't assign an x");

  function negOp(ordered: readonly DagNode[]) {
    for (const n of ordered) {
      n.x = -1;
    }
  }
  const neg = grid().lane(negOp);
  expect(() => neg(dag)).toThrow("assigned an x (-1) less than 0");

  function skipOp(ordered: readonly DagNode[]) {
    for (const [i, n] of ordered.entries()) {
      n.x = (i % 2) * 2;
    }
  }
  const skip = grid().lane(skipOp);
  expect(() => skip(dag)).toThrow("didn't assign increasing");

  function invalidOp(ordered: readonly DagNode[]) {
    for (const n of ordered) {
      n.x = 0;
    }
  }
  const invalid = grid().lane(invalidOp);
  expect(() => invalid(dag)).toThrow("assigned an overlapping lane");
});

test("grid() throws for arguments", () => {
  expect(() => grid(undefined as never)).toThrow("grid");
});
