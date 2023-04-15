import { verifyId } from "./utils";

test("verifyId() throws", () => {
  // @ts-expect-error wrong type
  expect(() => verifyId(0)).toThrow(
    `supposed to be type string but got type "number"`
  );
});
