import { setEqual } from "./collections";
import { assert } from "./test-utils";
import { berr, ierr } from "./utils";

test("assert throws", () => {
  expect(assert(true)).toBeUndefined();
  expect(() => assert(false)).toThrow("failed assert");
});

test("setEquals fails for different sizes", () => {
  expect(setEqual(new Set(), new Set([1]))).toBe(false);
});

test("i err()", () => {
  expect(ierr`prefix ${5} suffix`).toEqual(
    Error(
      "internal error: prefix 5 suffix; if you encounter this please submit an issue at: https://github.com/erikbrinkman/d3-dag/issues"
    )
  );
});

function foo() {
  // noop
}

test("b err()", () => {
  expect(berr`type ${foo} extra info ${5}`).toEqual(
    Error("custom type 'foo' extra info 5")
  );
});
