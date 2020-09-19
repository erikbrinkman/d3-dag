import { arq, grafo, square } from "../examples";
import {
  arqcoordSpread,
  arquint,
  columnAdjacent,
  columnCenter,
  columnComplex,
  columnLeft
} from "../../src";

test("spread() works for square with zero column width", () => {
  // simple left is used as column assignment, which uses
  // the node's index in its layer as column index
  const layout = arquint()
    .column(columnLeft())
    .coord(arqcoordSpread())
    .columnWidth(() => 0)
    .columnSeparation(() => 1)
    .size([2, 2]);
  const dag = layout(square());
  const [zero, one, two, three] = dag.idescendants("before");

  for (const node of dag) {
    expect(node.x1).toEqual(node.x0);
  }
  expect(zero.x0).toEqual(0);
  expect([0, 2]).toContainEqual(one.x0);
  expect(two.x0).toEqual(2 - one.x0);
  expect(three.x0).toEqual(0);
});

test("spread() works for square with zero separation", () => {
  // simple left is used as column assignment, which uses
  // the node's index in its layer as column index
  const layout = arquint()
    .column(columnLeft())
    .coord(arqcoordSpread())
    .columnWidth(() => 1)
    .columnSeparation(() => 0)
    .size([2, 2]);
  const dag = layout(square());
  const [zero, one, two, three] = dag.idescendants("before");

  for (const node of dag) {
    expect(node.x1).toEqual(node.x0 + 1);
  }
  expect(zero.x0).toEqual(0);
  expect([0, 1]).toContainEqual(one.x0);
  expect([one.x1, 2 - one.x1]).toContainEqual(two.x0);
  expect(three.x0).toEqual(0);
});

test("left() works for arq", () => {
  const layout = arquint().column(columnLeft());
  const dag = layout(arq());
  const [zero, one, two, three, four, five] = dag
    .descendants()
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))
    .map((n) => n.columnIndex);

  expect(zero).toEqual(0);
  expect([one, two, four].sort()).toEqual([0, 1, 2]);
  expect([0, 1]).toContainEqual(three);
  expect(five).toEqual(1 - three);
});

test("center() works for square", () => {
  const layout = arquint().column(columnCenter());
  const dag = layout(square());
  const [zero, one, two, three] = dag
    .idescendants("before")
    .map((n) => n.columnIndex);

  expect([0, 1]).toContainEqual(zero);
  expect([one, two].sort()).toEqual([0, 1]);
  expect([0, 1]).toContainEqual(three);
});

test("center() works for arq", () => {
  const layout = arquint().column(columnCenter());
  const dag = layout(arq());
  const [zero, one, two, three, four, five] = dag
    .descendants()
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))
    .map((n) => n.columnIndex);

  expect([0, 1, 2]).toContainEqual(zero);
  expect([one, two, four].sort()).toEqual([0, 1, 2]);
  expect([one, two]).toContainEqual(three);
  expect(five).toEqual(four);
});

test("left complex() works for square", () => {
  const layout = arquint().column(columnComplex().center(false));
  const dag = layout(square());
  const [zero, one, two, three] = dag
    .idescendants("before")
    .map((n) => n.columnIndex);

  expect(zero).toEqual(0);
  expect([one, two].sort()).toEqual([0, 1]);
  expect(three).toEqual(0);
});

test("left complex() works for dag", () => {
  const layout = arquint().column(columnComplex().center(false));
  const dag = layout(arq());
  const [zero, one, two, three, four, five] = dag
    .descendants()
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))
    .map((n) => n.columnIndex);

  expect(zero).toEqual(0);
  expect([one, two, four].sort()).toEqual([0, 1, 2]);
  expect([one, two]).toContainEqual(three);
  expect(five).toEqual(four);
});

test("center complex() works for square", () => {
  const layout = arquint().column(columnComplex().center(true));
  const dag = layout(square());
  const [zero, one, two, three] = dag
    .idescendants("before")
    .map((n) => n.columnIndex);

  expect([0, 1]).toContainEqual(zero);
  expect([one, two].sort()).toEqual([0, 1]);
  expect([0, 1]).toContainEqual(three);
});

test("center complex() works for dag", () => {
  const layout = arquint().column(columnComplex().center(true));
  const dag = layout(arq());
  const [zero, one, two, three, four, five] = dag
    .descendants()
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))
    .map((n) => n.columnIndex);

  expect(zero).toEqual(1);
  expect([one, two, four].sort()).toEqual([0, 1, 2]);
  expect([one, two]).toContainEqual(three);
  expect(five).toEqual(four);
});

test("left adjacent() works for square", () => {
  const layout = arquint().column(columnAdjacent().center(false));
  const dag = layout(square());
  const [zero, one, two, three] = dag
    .idescendants("before")
    .map((n) => n.columnIndex);

  expect(zero).toEqual(0);
  expect([one, two].sort()).toEqual([0, 1]);
  expect(three).toEqual(0);
});

test("left adjacent() works for dag", () => {
  const layout = arquint().column(columnAdjacent().center(false));
  const dag = layout(arq());
  const [zero, one, two, three, four, five] = dag
    .descendants()
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))
    .map((n) => n.columnIndex);

  expect(zero).toEqual(0);
  expect([one, two, four].sort()).toEqual([0, 1, 2]);
  expect([one, two]).toContainEqual(three);
  expect(five).toEqual(four);
});

test("center adjacent() works for square", () => {
  const layout = arquint().column(columnAdjacent().center(true));
  const dag = layout(square());
  const [zero, one, two, three] = dag
    .idescendants("before")
    .map((n) => n.columnIndex);

  expect([0, 1]).toContainEqual(zero);
  expect([one, two].sort()).toEqual([0, 1]);
  expect([0, 1]).toContainEqual(three);
});

test("center adjacent() works for dag", () => {
  const layout = arquint().column(columnAdjacent().center(true));
  const dag = layout(arq());
  const [zero, one, two, three, four, five] = dag
    .descendants()
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))
    .map((n) => n.columnIndex);

  expect(zero).toEqual(1);
  expect([one, two, four].sort()).toEqual([0, 1, 2]);
  expect([one, two]).toContainEqual(three);
  expect(five).toEqual(four);
});

test("arquint() works for grafo", () => {
  const dag = grafo();
  const nodesBefore = dag.size();
  const laidout = arquint().size([2, 2])(dag);
  expect(laidout.size()).toEqual(nodesBefore);
  for (const link of laidout.ilinks()) {
    expect(link.points.length).toBeGreaterThan(1);
  }
});
