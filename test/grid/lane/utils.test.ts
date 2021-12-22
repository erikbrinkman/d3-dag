import { connect } from "../../../src/dag/create";
import { prepare } from "./utils";

test("prepare() fails", () => {
  const create = connect();
  const dag = create([["1", "0"]]);
  expect(() => prepare(dag)).toThrow("topological");
});
