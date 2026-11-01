import dagJson from "../examples/dag.json";
import exJson from "../examples/ex.json";
import genealogyJson from "../examples/genealogy.json";
import grafoJson from "../examples/grafo.json";
import materialsJson from "../examples/materials.json";
import squareJson from "../examples/square.json";
import zherebkoJson from "../examples/zherebko.json";

/** a graph as lists of node ids and edges */
export interface GraphData {
  readonly nodes: readonly { readonly id: string }[];
  readonly edges: readonly {
    readonly source: string;
    readonly target: string;
  }[];
}

/** convert parentIds format to {nodes, edges} */
function fromParentIds(
  data: readonly {
    readonly id: string;
    readonly parentIds?: readonly string[];
  }[],
): GraphData {
  const nodes = data.map((d) => ({ id: d.id }));
  const edges: { source: string; target: string }[] = [];
  for (const d of data) {
    for (const p of d.parentIds ?? []) {
      edges.push({ source: p, target: d.id });
    }
  }
  return { nodes, edges };
}

/** convert edge list to {nodes, edges}, deriving nodes from edge endpoints */
function fromEdgeList(
  data: readonly { readonly source: string; readonly target: string }[],
): GraphData {
  const ids = new Set<string>();
  const edges: { source: string; target: string }[] = [];
  for (const { source, target } of data) {
    ids.add(source);
    ids.add(target);
    edges.push({ source, target });
  }
  return { nodes: [...ids].map((id) => ({ id })), edges };
}

/** convert genealogy format (advisors field, numeric ids) */
function fromGenealogy(
  data: readonly {
    readonly id: number;
    readonly advisors?: readonly number[];
  }[],
): GraphData {
  const nodes = data.map((d) => ({ id: String(d.id) }));
  const edges: { source: string; target: string }[] = [];
  for (const d of data) {
    for (const a of d.advisors ?? []) {
      edges.push({ source: String(a), target: String(d.id) });
    }
  }
  return { nodes, edges };
}

/** the graphs in `examples/`, keyed by file name */
export const exampleGraphs = {
  square: fromParentIds(squareJson),
  dag: fromParentIds(dagJson),
  ex: fromParentIds(exJson),
  zherebko: fromEdgeList(
    (zherebkoJson as unknown as readonly (readonly [string, string])[]).map(
      ([source, target]) => ({ source, target }),
    ),
  ),
  grafo: fromParentIds(grafoJson),
  materials: fromEdgeList(materialsJson),
  genealogy: fromGenealogy(genealogyJson),
} satisfies Record<string, GraphData>;
