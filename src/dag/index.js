import {Node} from "./node";
import {default as count} from "./count";
import {default as depth} from "./depth";
import {default as equals} from "./equal";
import {default as height} from "./height";
import {default as reverse} from "./reverse";
import {default as sum} from "./sum";
import {eachBefore, eachAfter} from "./each";

export function Dag(nodes) {
  this._nodes = nodes;
}

function nodes() {
  return this._nodes;
}

function links() {
  if (!this._links) {
    this._links = [].concat(...this._nodes.map(n => n.children.map(c => ({
      source: n,
      target: c,
    }))));
  }
  return this._links;
}

function copy() {
  const cnodes = this.nodes().map(n => new Node(n.id, n.data));
  const mapping = cnodes.reduce((m, n) => { m[n.id] = n; return m; }, {});
  cnodes.forEach((cnode, i) => {
    const node = this.nodes()[i];
    cnode.children = node.children.map(c => mapping[c.id]);
    cnode.parents = node.parents.map(p => mapping[p.id]);
  });
  return new Dag(cnodes);
}

Dag.prototype = {
  constructor: Dag,
  computeDepth: depth,
  computeHeight: height,
  copy: copy,
  count: count,
  eachAfter: eachAfter,
  eachBefore: eachBefore,
  equals: equals,
  links: links,
  nodes: nodes,
  reverse: reverse,
  sum: sum,
};
