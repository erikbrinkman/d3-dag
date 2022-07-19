import { before, dot } from "../../src/dag/utils";
import { en, vee } from "../examples";

test("dot() works for vee", () => {
  const dag = vee();
  const dotString = dot(dag, (n) => n.data.id);
  expect(dotString).toBe(`digraph {
    "1" -> "2"
    "0" -> "2"
}`);
});

test("before() works for en", () => {
  // This is an edge case where we need to look at the unranked node 0, in
  // order to appropriately rank 2 and 1 in the correct order. If we actually
  // made shadow edges we'd arrive at this naturally.
  const dag = en();

  function priority({ data }: { data: { id: string } }): number | undefined {
    if (data.id === "1") {
      return 2;
    } else if (data.id === "2") {
      return 1;
    } else {
      return undefined;
    }
  }

  const nodes = [...before(dag, priority)];
  expect(nodes.map(({ data }) => data.id)).toEqual(["0", "2", "1", "3"]);
});
