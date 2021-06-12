import { fluent } from "../src/iters";

test("fluent works like an iterable", () => {
  const array: number[] = [];
  for (const element of fluent([1, 2, 3])) {
    array.push(element);
  }
  expect(array).toEqual([1, 2, 3]);
});

test("concat()", () => {
  const concated = [...fluent<number>([]).concat([], [1], fluent([2, 3]))];
  expect(concated).toEqual([1, 2, 3]);
  expect([...fluent([1, 2]).concat([3])]).toEqual([1, 2, 3]);
});

test("entries()", () => {
  expect([...fluent([]).entries()]).toEqual([]);
  expect([...fluent([1, 2, 3]).entries()]).toEqual([
    [0, 1],
    [1, 2],
    [2, 3]
  ]);
});

test("every()", () => {
  expect(fluent([1, 2, 3]).every((v) => v > 0)).toBeTruthy();
  expect(fluent([1, -2, 3]).every((v) => v > 0)).toBeFalsy();
});

test("fill()", () => {
  expect([...fluent([]).fill(null)]).toEqual([]);
  expect([...fluent([1, 2, 3]).fill("f")]).toEqual(["f", "f", "f"]);
});

test("filter()", () => {
  expect([...fluent([1, -2, 3]).filter((v) => v > 0)]).toEqual([1, 3]);
  expect([...fluent([1, -2, 3]).filter((v) => v < -3)]).toEqual([]);
});

test("find()", () => {
  expect(fluent([1, 2, 3]).find((v) => v > 1 && v < 3)).toBe(2);
  expect(fluent([1, 2, 3]).find((v, i) => i > 2)).toBeUndefined();
});

test("findIndex()", () => {
  expect(fluent([1, 2, 3]).findIndex((v) => v > 1 && v < 3)).toBe(1);
  expect(fluent([1, 2, 3]).findIndex((v, i) => i > 2)).toBe(-1);
});

test("flatMap()", () => {
  expect([...fluent([1, 2]).flatMap((v, i) => [v, i])]).toEqual([1, 0, 2, 1]);
  expect([...fluent([1, 2]).flatMap((v) => fluent([v]))]).toEqual([1, 2]);
});

test("forEach()", () => {
  const array: number[] = [];
  fluent([1, 2, 3]).forEach((v, i) => {
    array.push(v, i);
  });
  expect(array).toEqual([1, 0, 2, 1, 3, 2]);
});

test("includes()", () => {
  expect(fluent([1, 2]).includes(1)).toBeTruthy();
  expect(fluent([1, 2]).includes(1, 1)).toBeFalsy();
  expect(fluent([1, 2, 1]).includes(1, 1)).toBeTruthy();
  expect(() => fluent([1]).includes(1, -1)).toThrow(
    "fromIndex doesn't support negative numbers because generator length isn't known"
  );
});

test("indexOf()", () => {
  expect(fluent([1, 2]).indexOf(1)).toBe(0);
  expect(fluent([1, 2]).indexOf(1, 1)).toBe(-1);
  expect(fluent([1, 2, 1]).indexOf(1)).toBe(0);
  expect(fluent([1, 2, 1]).indexOf(1, 1)).toBe(2);
  expect(() => fluent([1]).indexOf(1, -1)).toThrow(
    "fromIndex doesn't support negative numbers because generator length isn't known"
  );
});

test("join()", () => {
  expect(fluent(["a", "b"]).join()).toBe("a,b");
  expect(fluent(["a", "b"]).join(" ")).toBe("a b");
});

test("keys()", () => {
  expect([...fluent([]).keys()]).toEqual([]);
  expect([...fluent(["a", "b"]).keys()]).toEqual([0, 1]);
});

test("lastIndexOf()", () => {
  expect(fluent([2, 1]).lastIndexOf(1)).toBe(1);
  expect(fluent([2, 1]).lastIndexOf(1, 0)).toBe(-1);
  expect(fluent([1, 2, 1]).lastIndexOf(1)).toBe(2);
  expect(fluent([1, 2, 1]).lastIndexOf(1, 1)).toBe(0);
  expect(() => fluent([1]).lastIndexOf(1, -1)).toThrow(
    "lastIndexOf doesn't support negative numbers because generator length isn't known"
  );
});

test("length", () => {
  expect(fluent([]).length).toBeCloseTo(0);
  expect(fluent([null]).length).toBeCloseTo(1);
  expect(fluent([1, 2, 3]).length).toBeCloseTo(3);
});

test("map()", () => {
  expect([...fluent([1, 2, 3]).map((v) => v.toString())]).toEqual([
    "1",
    "2",
    "3"
  ]);
  expect([...fluent<number>([]).map((v) => v.toString())]).toEqual([]);
});

test("reduce()", () => {
  expect(fluent([1, 2, 3]).reduce((a, b) => a + b)).toBeCloseTo(6);
  expect(fluent([1, 2, 3]).reduce((a, b) => a + b, "")).toBe("123");
  expect(() => fluent<number>([]).reduce((a, b) => a + b)).toThrow(
    "Reduce of empty iterable with no initial value"
  );
});

test("reverse()", () => {
  expect([...fluent([]).reverse()]).toEqual([]);
  expect([...fluent([1, 2, 3]).reverse()]).toEqual([3, 2, 1]);
});

test("slice()", () => {
  expect([...fluent([]).slice()]).toEqual([]);
  expect([...fluent([1, 2, 3]).slice()]).toEqual([1, 2, 3]);
  expect([...fluent([1, 2, 3]).slice(1)]).toEqual([2, 3]);
  expect([...fluent([1, 2, 3]).slice(1, 2)]).toEqual([2]);
});

test("slice() on infinite", () => {
  let i = 0;
  const iter = {
    [Symbol.iterator]() {
      return {
        next: () => ({ value: i++, done: false })
      };
    }
  };
  expect([...fluent(iter).slice(1, 4)]).toEqual([1, 2, 3]);
});

test("some()", () => {
  expect(fluent([1, 2, 3]).some((v) => v < 0)).toBeFalsy();
  expect(fluent([1, -2, 3]).some((v) => v > 0)).toBeTruthy();
});

test("sort()", () => {
  expect([...fluent([]).sort()]).toEqual([]);
  expect([...fluent(["b", "a"]).sort()]).toEqual(["a", "b"]);
  expect([...fluent([1, 2, 3]).sort((a, b) => b - a)]).toEqual([3, 2, 1]);
});

test("splice()", () => {
  expect([...fluent([]).splice(0)]).toEqual([]);
  expect([...fluent([1, 2, 3]).splice(0)]).toEqual([1, 2, 3]);
  expect([...fluent([1, 2, 3]).splice(0, 3)]).toEqual([]);
  expect([...fluent([1, 2, 3]).splice(1, 3)]).toEqual([1]);
  expect([...fluent([1, 2, 3]).splice(1, 1)]).toEqual([1, 3]);
  expect([...fluent([1, 2, 3]).splice(0, 2)]).toEqual([3]);
  expect([...fluent([1, 2, 3]).splice(0, 0, 3, 2)]).toEqual([3, 2, 1, 2, 3]);
  expect([...fluent([1, 2, 3]).splice(0, 1, 3)]).toEqual([3, 2, 3]);
  expect([...fluent([1, 2, 3]).splice(1, 1, 0, 1)]).toEqual([1, 0, 1, 3]);
});

test("values()", () => {
  expect([...fluent([]).values()]).toEqual([]);
  expect([...fluent([1, 2, 3]).values()]).toEqual([1, 2, 3]);
});
