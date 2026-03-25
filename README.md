# d3-dag

[![npm](https://img.shields.io/npm/v/d3-dag.svg)](https://www.npmjs.com/package/d3-dag)
[![build](https://github.com/erikbrinkman/d3-dag/workflows/build/badge.svg)](https://github.com/erikbrinkman/d3-dag/actions)
[![docs](https://img.shields.io/badge/docs-docs-informational)](https://erikbrinkman.github.io/d3-dag/modules.html)

Lightweight, TypeScript-first DAG layout for the web.
`d3-dag` provides layered graph layout algorithms for directed acyclic graphs.

## Why d3-dag?

- **Different layouts** - optimal edge crossing minimization, multiple coordinate assignment strategies, and unique layout algorithms (Zherebko, Grid) not available elsewhere in JavaScript
- **Small bundle** - a fraction of elkjs's ~500KB transpiled Java
- **TypeScript-first** - full type safety with generic operators and immutable builders; dagre v3 added TypeScript support, but d3-dag's generic operator pattern provides deeper type safety
- **Works with React Flow** - drop-in replacement for dagre as a layout engine (see below)

## Quick Start with React Flow

If you're using [React Flow](https://reactflow.dev/) and want different layouts from dagre, d3-dag is a drop-in replacement:

```ts
import { dagre } from "d3-dag";

function getLayoutedElements(nodes, edges, direction = "TB") {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: direction });
  grf.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) {
    grf.setNode(node.id, {
      width: node.measured?.width ?? 172,
      height: node.measured?.height ?? 36,
    });
  }
  for (const edge of edges) grf.setEdge(edge.source, edge.target);
  dagre.layout(grf);
  return {
    nodes: nodes.map((node) => {
      const pos = grf.node(node.id);
      return {
        ...node,
        position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
      };
    }),
    edges,
  };
}
```

The dagre-compatible API supports familiar options (`rankdir`, `nodesep`, `ranksep`) with progressive disclosure into d3-dag's advanced algorithms:

```ts
import { dagre, sugiyama, decrossOpt, coordQuad } from "d3-dag";

const grf = new dagre.graphlib.Graph();
grf.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 100 });
// ... add nodes/edges ...
dagre.layout(grf);

// Or upgrade to better algorithms
dagre.layout(grf, sugiyama().decross(decrossOpt()).coord(coordQuad()));
```

## Migrating from dagre

Replace `import dagre from "dagre"` with `import { dagre } from "d3-dag"`. Most graph construction and layout methods work the same.

### Supported dagre API

| Category | Methods |
|----------|---------|
| **Setup** | `setGraph`, `graph`, `setDefaultNodeLabel`, `setDefaultEdgeLabel`, `isDirected`, `isCompound`, `isMultigraph` |
| **Nodes** | `setNode`, `setNodes`, `removeNode`, `hasNode`, `node`, `nodes`, `nodeCount`, `filterNodes` |
| **Edges** | `setEdge`, `removeEdge`, `hasEdge`, `edge`, `edges`, `edgeCount`, `setPath` |
| **Traversal** | `predecessors`, `successors`, `neighbors`, `inEdges`, `outEdges`, `nodeEdges`, `sources`, `sinks` |
| **Layout** | `dagre.layout(grf)` with optional `Operator` (e.grf. `sugiyama()` or `zherebko()`) |

### Unsupported dagre API

- **Compound graphs**: `setParent`, `parent`, `children`
- **Serialization**: `json.write`, `json.read`
- **Algorithms**: `alg.*` (use d3-dag's native operators instead)

### Notable differences from dagre

- `setGraph` accepts additional `quality`, `ranker`, and `algorithm` options
- `dagre.layout` accepts an optional `Operator` for fine-grained algorithm control
- `graph()` returns a shallow copy of the config (mutations require `setGraph`)
- Default `nodesep` and `ranksep` are `50` (same as dagre)

## Quality Presets

The dagre-compatible API accepts a `quality` option that controls the layout speed/quality trade-off:

```ts
grf.setGraph({ quality: "fast" }); // faster layout, lower quality
grf.setGraph();                  // default: "medium", better layout, slower
```

| preset | description | genealogy (184 nodes) | vs dagre v3 |
|--------|-------------|----------------------:|-------------|
| `"fast"` | simplex layering, DFS decrossing, greedy coordinates | 5.1 ms | ~4x faster |
| `"medium"` | simplex layering, two-layer decrossing, simplex coordinates | 49 ms | ~2x slower |
| `"slow"` | simplex layering, optimal decrossing, simplex coordinates | small graphs only | — |

The `quality` and `ranker` options only apply when using the sugiyama algorithm (the default). You can also set `algorithm` to `"zherebko"` or `"grid"` for alternative layouts:

```ts
grf.setGraph({ algorithm: "zherebko" }); // linear topological layout
grf.setGraph({ algorithm: "grid" });     // grid-based topological layout
```

The default (`"medium"`) produces better layouts at the cost of being roughly 2x slower on large graphs. Use `"fast"` when layout speed matters more than visual quality, e.grf. for interactive or animated graphs.

dagre v3 added a `customOrder` callback and ordering constraints, allowing users to bring their own node ordering algorithm. d3-dag provides multiple built-in strategies (including ILP-optimal crossing minimization) out of the box, along with multiple coordinate assignment and layering algorithms not available in dagre.

## Examples

- **Sugiyama** [[examples](https://erikbrinkman.github.io/d3-dag/documents/examples.html?layout=sugiyama)] [[api](https://erikbrinkman.github.io/d3-dag/functions/sugiyama-1.html)] - a layered layout
- **Zherebko** [[examples](https://erikbrinkman.github.io/d3-dag/documents/examples.html?layout=zherebko)] [[api](https://erikbrinkman.github.io/d3-dag/functions/zherebko-1.html)] - a linear topological layout
- **Grid** [[examples](https://erikbrinkman.github.io/d3-dag/documents/examples.html?layout=grid)] [[api](https://erikbrinkman.github.io/d3-dag/functions/grid-1.html)] - a grid based topological layout
- **Dagre Comparison** [[docs](https://erikbrinkman.github.io/d3-dag/documents/dagre.html)] [[api](https://erikbrinkman.github.io/d3-dag/variables/dagre.html)] - side-by-side comparison of d3-dag vs dagre

## Installing

If you use node, `npm i d3-dag` or `bun add d3-dag`.
Otherwise you can load it using `unpkg`:

```html
<script src="https://unpkg.com/d3-dag@1.1.0"></script>
<script>
const dag = d3.graphStratify(...);
const layout = d3.sugiyama();
layout(dag);

// ... actually render here ...
for (const node of dag.nodes()) {
  console.log(node.x, node.y);
}
for (const { points } of dag.links()) {
  console.log(points);
}

</script>
```

## General Usage Notes

This library is built around the concept of operators.
Operators are functions with a fluent interface to modify their behavior.
Every function that modifies behavior returns a copy, and will not modify the original operator.
For example, the `stratify` operator creates dags from id-based parent data, can be used like so:

```ts
// note initial function call with no arguments to create default operator
const stratify = graphStratify();
const dag = stratify([{ id: "parent" }, { id: "child", parentIds: ["parent"] }]);

stratify.id(({ myid }: { myid: string }) => myid);
// doesn't work, stratify was not modified
const dag = stratify([{ myid: "parent" }, { myid: "child", parentIds: ["parent"] }]);

const myStratify = stratify.id(({ myid }: { myid: string }) => myid);
// works!
const dag = myStratify([{ myid: "parent" }, { myid: "child", parentIds: ["parent"] }]);
```

## Updating

For information about changes between releases see the [`changelog`](CHANGELOG.md).

## Contributing

Contributions, issues, and PRs are all welcome!
