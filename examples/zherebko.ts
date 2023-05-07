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
export const data = [
  ["1", "2"],
  ["1", "5"],
  ["1", "7"],
  ["2", "3"],
  ["2", "4"],
  ["2", "5"],
  ["2", "7"],
  ["2", "8"],
  ["3", "6"],
  ["3", "8"],
  ["4", "7"],
  ["5", "7"],
  ["5", "8"],
  ["5", "9"],
  ["6", "8"],
  ["7", "8"],
  ["9", "10"],
  ["9", "11"],
] as const;

// create our builder and turn the raw data into a graph
const builder = d3dag.graphConnect();
const graph = builder(data);

// -------------- //
// Compute Layout //
// -------------- //

// set the layout functions
const nodeRadius = 20;
const nodeSize = [nodeRadius * 2, nodeRadius * 2] as const;
// this truncates the edges so we can render arrows nicely
const shape = d3dag.tweakShape(nodeSize, d3dag.shapeEllipse);
// use this to render our edges
const line = d3.line().curve(d3.curveMonotoneY);
// here's the layout operator, uncomment some of the settings
const layout = d3dag
  .zherebko()
  .nodeSize(nodeSize)
  .gap([nodeRadius / 2, nodeRadius / 2])
  .tweaks([shape]);

// actually perform the layout and get the final size
const { width, height } = layout(graph);

// --------- //
// Rendering //
// --------- //

// colors
const steps = graph.nnodes() - 1;
const interp = d3.interpolateRainbow;
const colorMap = new Map(
  [...graph.nodes()]
    .sort((a, b) => a.y - b.y)
    .map((node, i) => [node.data, interp(i / steps)])
);

// global
const svg = d3
  .select("#svg")
  // pad a little for link thickness
  .style("width", width + 4)
  .style("height", height + 4);
const trans = svg.transition().duration(750);

// nodes
svg
  .select("#nodes")
  .selectAll("g")
  .data(graph.nodes())
  .join((enter) =>
    enter
      .append("g")
      .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
      .attr("opacity", 0)
      .call((enter) => {
        enter
          .append("circle")
          .attr("r", nodeRadius)
          .attr("fill", (n) => colorMap.get(n.data)!);
        enter
          .append("text")
          .text((d) => d.data)
          .attr("font-weight", "bold")
          .attr("font-family", "sans-serif")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .attr("fill", "white");
        enter.transition(trans).attr("opacity", 1);
      })
  );

// link gradients
svg
  .select("#defs")
  .selectAll("linearGradient")
  .data(graph.links())
  .join((enter) =>
    enter
      .append("linearGradient")
      .attr("id", ({ source, target }) =>
        encodeURIComponent(`${source.data}--${target.data}`)
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
          .attr("stop-color", ({ source }) => colorMap.get(source.data)!);
        enter
          .append("stop")
          .attr("class", "grad-stop")
          .attr("offset", "100%")
          .attr("stop-color", ({ target }) => colorMap.get(target.data)!);
      })
  );

// link paths
svg
  .select("#links")
  .selectAll("path")
  .data(graph.links())
  .join((enter) =>
    enter
      .append("path")
      .attr("d", ({ points }) => line(points))
      .attr("fill", "none")
      .attr("stroke-width", 3)
      .attr(
        "stroke",
        ({ source, target }) => `url(#${source.data}--${target.data})`
      )
      .attr("opacity", 0)
      .call((enter) => enter.transition(trans).attr("opacity", 1))
  );

// Arrows
const arrowSize = 80;
const arrowLen = Math.sqrt((4 * arrowSize) / Math.sqrt(3));
const arrow = d3.symbol().type(d3.symbolTriangle).size(arrowSize);
svg
  .select("#arrows")
  .selectAll("path")
  .data(graph.links())
  .join((enter) =>
    enter
      .append("path")
      .attr("d", arrow)
      .attr("fill", ({ target }) => colorMap.get(target.data)!)
      .attr("transform", arrowTransform)
      .attr("opacity", 0)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      // use this to put a white boundary on the tip of the arrow
      .attr("stroke-dasharray", `${arrowLen},${arrowLen}`)
      .call((enter) => enter.transition(trans).attr("opacity", 1))
  );
