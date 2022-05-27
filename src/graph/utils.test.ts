import { verifyId } from "./utils";

test("verifyId() throws", () => {
  expect(() => verifyId(0 as never)).toThrow(
    `supposed to be type string but got type "number"`
  );
});
