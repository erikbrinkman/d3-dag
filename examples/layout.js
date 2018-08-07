'use strict';
function layout(dag) {
  const padding = 0.01;
  const svg = d3.select('svg');
  const line = d3.line()
    .curve(d3.curveCatmullRom)
    .x(d => d.x)
    .y(d => d.y);

  svg.append('g').classed('link', true)
    .selectAll('path').data(dag.links()).enter().append('path')
    .attr('d', ({ source, target, data }) => line([{x: source.x, y: source.y}].concat(data.points || [], [{x: target.x, y: target.y}])));
  const nodes = svg.append('g').classed('node', true)
    .selectAll('g').data(dag.nodes()).enter().append('g')
    .attr('transform', ({x, y}) => `translate(${x}, ${y})`);
  nodes.append('circle');

  // Measure and trim
  const { x, y, width, height } = svg.node().getBBox();
  svg.attr('viewBox', [x - padding, y - padding, width + 2 * padding, height + 2 * padding].join(' '));

  // Add text, which screws up measureement
  nodes.append('text').text(d => d.id);
}
