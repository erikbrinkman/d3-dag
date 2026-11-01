import originalDagre from "@dagrejs/dagre";
import { bench, group, run } from "mitata";
import { exampleGraphs } from "../docs-src/graphs.js";
import type { DagreQuality } from "./dagre.js";
import { dagre } from "./dagre.js";

// graphs where decrossOpt (slow preset) is feasible
const smallGraphs = new Set(["square", "dag", "ex", "zherebko", "grafo"]);

for (const [name, graphData] of Object.entries(exampleGraphs)) {
  group(
    `layout: ${name} (${graphData.nodes.length} nodes, ${graphData.edges.length} edges)`,
    () => {
      const presets: DagreQuality[] = smallGraphs.has(name)
        ? ["fast", "medium", "slow"]
        : ["fast", "medium"];

      for (const quality of presets) {
        bench(`d3-dag (${quality})`, () => {
          const grf = new dagre.graphlib.Graph();
          grf.setGraph({ quality });
          grf.setDefaultEdgeLabel(() => ({}));
          for (const n of graphData.nodes)
            grf.setNode(n.id, { width: 40, height: 40 });
          for (const e of graphData.edges) grf.setEdge(e.source, e.target);
          dagre.layout(grf);
        });
      }

      bench("dagre", () => {
        const grf = new originalDagre.graphlib.Graph();
        grf.setGraph({});
        grf.setDefaultEdgeLabel(() => ({}));
        for (const n of graphData.nodes)
          grf.setNode(n.id, { width: 40, height: 40 });
        for (const e of graphData.edges) grf.setEdge(e.source, e.target);
        originalDagre.layout(grf);
      });
    },
  );
}

await run();
