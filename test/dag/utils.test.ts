import { dot } from "../../src/dag/utils";
import { vee } from "../examples";

test("dot() works for vee", () => {
  const dag = vee();
  const dotString = dot(dag, (n) => n.data.id);
  expect(dotString).toBe(`digraph {
    "1" -> "2"
    "0" -> "2"
}`);
});
