import * as d3 from "https://cdn.skypack.dev/d3@7";
// FIXME update to production version and remove from tsconfig
import * as d3dag from "http://localhost:4507/bundle/d3-dag.esm.min.js";

// ----- //
// Setup //
// ----- //

/**
 * get transform for arrow rendering
 *
 * This transform takes anything with points (a graph link) and returns a
 * transform that puts an arrow on the last point, aligned based off of the
 * second to last.
 */
function arrowTransform({
  points,
}: {
  points: readonly (readonly [number, number])[];
}): string {
  const [[x1, y1], [x2, y2]] = points.slice(-2);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90;
  return `translate(${x2}, ${y2}) rotate(${angle})`;
}

// our raw data to render
const data = [
  {
    id: "0",
    parentIds: ["8"],
  },
  {
    id: "1",
    parentIds: [],
  },
  {
    id: "2",
    parentIds: [],
  },
  {
    id: "3",
    parentIds: ["11"],
  },
  {
    id: "4",
    parentIds: ["12"],
  },
  {
    id: "5",
    parentIds: ["18"],
  },
  {
    id: "6",
    parentIds: ["9", "15", "17"],
  },
  {
    id: "7",
    parentIds: ["3", "17", "20", "21"],
  },
  {
    id: "8",
    parentIds: [],
  },
  {
    id: "9",
    parentIds: ["4"],
  },
  {
    id: "10",
    parentIds: ["16", "21"],
  },
  {
    id: "11",
    parentIds: ["2"],
  },
  {
    id: "12",
    parentIds: ["21"],
  },
  {
    id: "13",
    parentIds: ["4", "12"],
  },
  {
    id: "14",
    parentIds: ["1", "8"],
  },
  {
    id: "15",
    parentIds: [],
  },
  {
    id: "16",
    parentIds: ["0"],
  },
  {
    id: "17",
    parentIds: ["19"],
  },
  {
    id: "18",
    parentIds: ["9"],
  },
  {
    id: "19",
    parentIds: [],
  },
  {
    id: "20",
    parentIds: ["13"],
  },
  {
    id: "21",
    parentIds: [],
  },
];

// the data type for out dynamic nodes to indicate if they were clicked on
interface Data {
  id: string;
  active: boolean;
}
type NodeType = d3dag.MutGraphNode<Data, undefined>;
type LinkType = d3dag.MutGraphLink<Data, undefined>;

// create the graph, and maps to other ids for the dynamic updates
const grf = d3dag.graph<Data, undefined>();
const nodeMap = new Map<string, NodeType>();
const parentMap = new Map<string, readonly string[]>(
  data.map(({ id, parentIds }) => [id, parentIds])
);
const childMap = new Map<string, string[]>();
for (const [id, parentIds] of parentMap) {
  for (const parentId of parentIds) {
    const ids = childMap.get(parentId);
    if (ids === undefined) {
      childMap.set(parentId, [id]);
    } else {
      ids.push(id);
    }
  }
}

// pick the initial node
const [initId] = parentMap.keys();
const initNode = grf.node({ id: initId, active: false });
nodeMap.set(initId, initNode);

// assign the colors
const interp = d3.interpolateRainbow;
const colorMap = new Map<string, string>(
  [...parentMap.keys()].map((id, i) => [id, interp(i / (parentMap.size - 1))])
);
const deactive = "#aaa";

function getColor({ id, active }: Data): string {
  return active ? colorMap.get(id)! : deactive;
}

// ------ //
// Layout //
// ------ //

const nodeRadius = 20;
const nodeSize = [nodeRadius * 2, nodeRadius * 2] as const;
const shape = d3dag.tweakShape(nodeSize, d3dag.shapeEllipse);
const layout = d3dag
  .sugiyama()
  .nodeSize(nodeSize)
  .gap([nodeRadius, nodeRadius])
  .tweaks([shape]);
const line = d3.line().curve(d3.curveMonotoneY);
const svg = d3.select("#svg");

// -------------------- //
// Dynamic Graph Update //
// -------------------- //

function click(node: NodeType): void {
  const { data } = node;
  data.active = !data.active;
  if (data.active) {
    // connect nodes
    for (const childId of childMap.get(data.id) ?? []) {
      let child = nodeMap.get(childId);
      if (!child) {
        child = grf.node({ id: childId, active: false });
        nodeMap.set(childId, child);
        node.child(child);
      } else if (!child.data.active) {
        node.child(child);
      }
    }
    for (const parentId of parentMap.get(data.id) ?? []) {
      let par = nodeMap.get(parentId);
      if (!par) {
        par = grf.node({ id: parentId, active: false });
        nodeMap.set(parentId, par);
        node.parent(par);
      } else if (!par.data.active) {
        node.parent(par);
      }
    }
  } else {
    // disconnect nodes
    for (const link of [...node.childLinks()]) {
      const { target } = link;
      if (!target.data.active) {
        link.delete();
        if (target.nchildLinks() === 0 && target.nparentLinks() === 0) {
          nodeMap.delete(target.data.id);
          target.delete();
        }
      }
    }
    for (const link of [...node.parentLinks()]) {
      const { source } = link;
      if (!source.data.active) {
        link.delete();
        if (source.nchildLinks() === 0 && source.nparentLinks() === 0) {
          nodeMap.delete(source.data.id);
          source.delete();
        }
      }
    }
    // delete self if graph not empty
    if (
      node.nchildLinks() === 0 &&
      node.nparentLinks() === 0 &&
      grf.nnodes() > 1
    ) {
      nodeMap.delete(node.data.id);
      node.delete();
    }
  }
  renderDynamic();
}

// --------- //
// Rendering //
// --------- //
//  NOTE d3 typing is bad here, and whenever we `selectAll` d3 picks up
//  `unknown` as the old datum of the selection, and requires callbacks to have
//  the union of that and the actual data, which clobbers the type information.
//  As a result, we need to manually specify the datum on a few calls, mostly
//  to `selectAll`

export function renderDynamic(): void {
  const { width, height } = layout(grf);
  const trans = svg.transition().duration(750);
  svg
    .transition(trans)
    .attr("width", width + 4)
    .attr("height", height + 4);

  // nodes
  svg
    .select("#nodes")
    .selectAll<d3.BaseType, NodeType>("g")
    .data(grf.nodes(), ({ data }): string => data.id)
    .join(
      (enter) =>
        enter
          .append("g")
          .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
          .attr("opacity", 0)
          .on("click", (_, node: NodeType) => click(node))
          .call((enter) => {
            enter
              .append("circle")
              .attr("r", nodeRadius)
              .attr("fill", ({ data }) => getColor(data));
            enter
              .append("text")
              .text(({ data }) => data.id)
              .attr("font-weight", "bold")
              .attr("font-family", "sans-serif")
              .attr("text-anchor", "middle")
              .attr("alignment-baseline", "middle")
              .attr("fill", "white");
            enter.transition(trans).attr("opacity", 1);
          }),
      (update) =>
        update.call((update) =>
          update
            .transition(trans)
            .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
            .select("circle")
            .attr("r", nodeRadius)
            .attr("fill", ({ data }) => getColor(data))
        ),
      (exit) =>
        exit.call((exit) => exit.transition(trans).attr("opacity", 0).remove())
    );

  // link gradients
  svg
    .select("#defs")
    .selectAll<d3.BaseType, LinkType>("linearGradient")
    .data(
      grf.links(),
      ({ source, target }) => `${source.data.id}--${target.data.id}`
    )
    .join(
      (enter) =>
        enter
          .append("linearGradient")
          .attr("id", ({ source, target }) =>
            encodeURIComponent(`dyn--${source.data.id}--${target.data.id}`)
          )
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", ({ points }) => points[0][0])
          .attr("x2", ({ points }) => points[points.length - 1][0])
          .attr("y1", ({ points }) => points[0][1])
          .attr("y2", ({ points }) => points[points.length - 1][1])
          .call((enter) => {
            enter
              .append("stop")
              .attr("class", "grad-start")
              .attr("offset", "0%")
              .attr("stop-color", ({ source }) => getColor(source.data));
            enter
              .append("stop")
              .attr("class", "grad-stop")
              .attr("offset", "100%")
              .attr("stop-color", ({ target }) => getColor(target.data));
          }),
      (update) =>
        update.call((update) =>
          update.transition(trans).call((update) => {
            update
              .attr("x1", ({ source }) => source.x)
              .attr("x2", ({ target }) => target.x)
              .attr("y1", ({ source }) => source.y)
              .attr("y2", ({ target }) => target.y);
            update
              .select(".grad-start")
              .attr("stop-color", ({ source }) => getColor(source.data));
            update
              .select(".grad-stop")
              .attr("stop-color", ({ target }) => getColor(target.data));
          })
        )
    );

  // link paths
  svg
    .select("#links")
    .selectAll<d3.BaseType, LinkType>("path")
    .data(
      grf.links(),
      ({ source, target }) => `${source.data.id}--${target.data.id}`
    )
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("d", ({ points }) => line(points))
          .attr("fill", "none")
          .attr("stroke-width", 3)
          .attr(
            "stroke",
            ({ source, target }) =>
              `url(#dyn--${source.data.id}--${target.data.id})`
          )
          .attr("opacity", 0)
          .call((enter) => enter.transition(trans).attr("opacity", 1)),
      (update) =>
        update.call((update) =>
          update.transition(trans).attr("d", ({ points }) => line(points))
        ),
      (exit) =>
        exit.call((exit) => exit.transition(trans).attr("opacity", 0).remove())
    );

  // Arrows
  const arrowSize = 80;
  const arrowLen = Math.sqrt((4 * arrowSize) / Math.sqrt(3));
  const arrow = d3.symbol().type(d3.symbolTriangle).size(arrowSize);
  svg
    .select("#arrows")
    .selectAll<d3.BaseType, LinkType>("path")
    .data(
      grf.links(),
      ({ source, target }) => `${source.data.id}--${target.data.id}`
    )
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("d", arrow)
          .attr("fill", ({ target }) => getColor(target.data))
          .attr("transform", arrowTransform)
          .attr("opacity", 0)
          .attr("stroke", "white")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", `${arrowLen},${arrowLen}`)
          .call((enter) => enter.transition(trans).attr("opacity", 1)),
      (update) =>
        update.call((update) =>
          update
            .transition(trans)
            .attr("transform", arrowTransform)
            .attr("fill", ({ target }) => getColor(target.data))
        ),
      (exit) =>
        exit.call((exit) => exit.transition(trans).attr("opacity", 0).remove())
    );
}

renderDynamic();
