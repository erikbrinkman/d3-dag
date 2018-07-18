// FIXME Change each depth to each as its the best default if you don't care
import Node from "./node";
import count from "./count";
import depth from "./depth";
import eachAfter from "./eachAfter";
import eachBefore from "./eachBefore";
import eachBreadth from "./eachBreadth";
import eachDepth from "./eachDepth";
import equals from "./equals";
import every from "./every";
import height from "./height";
import links from "./links";
import nodes from "./descendants";
import reverse from "./reverse";
import some from "./some";
import sum from "./sum";

export default function Dag(roots) {
  this.roots = roots;
}

function dagEachDepth(func) {
  eachDepth(this.roots, func);
  return this;
}

function dagEachBreadth(func) {
  eachBreadth(this.roots, func);
  return this;
}

function copy() {  // FIXME Also work for nodes
  const nodes = [];
  const cnodes = [];
  this.eachDepth(node => {
    nodes.push(node);
    const cnode = new Node(node.id, node.data);
    cnodes.push(cnode);
  });

  const mapping = cnodes.reduce((m, n) => { m[n.id] = n; return m; }, {});

  const croots = [];
  cnodes.forEach((cnode, i) => {
    const node = nodes[i];
    cnode.children = node.children.map(c => mapping[c.id]);
    cnode.parents = node.parents.map(p => mapping[p.id]);
    if (!cnode.parents.length) {
      croots.push(cnode);
    }
  });
  return new Dag(croots);
}

Dag.prototype = {
  constructor: Dag,
  copy: copy,
  count: count,
  depth: depth,
  eachAfter: eachAfter,
  eachBefore: eachBefore,
  eachBreadth: dagEachBreadth,
  eachDepth: dagEachDepth,
  equals: equals,
  every: every,
  height: height,
  links: links,
  nodes: nodes,
  reverse: reverse,
  some: some,
  sum: sum,
};
