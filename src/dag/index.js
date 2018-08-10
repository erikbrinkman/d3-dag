import childLinks from "./childLinks";
import count from "./count";
import depth from "./depth";
import descendants from "./descendants";
import eachAfter from "./eachAfter";
import eachBefore from "./eachBefore";
import eachBreadth from "./eachBreadth";
import eachChildLinks from "./eachChildLinks";
import eachDepth from "./eachDepth";
import eachLinks from "./eachLinks";
import equals from "./equals";
import every from "./every";
import height from "./height";
import links from "./links";
import reduce from "./reduce";
import roots from "./roots";
import some from "./some";
import sum from "./sum";

export default function Node(id, data) {
  this.id = id;
  this.data = data;
  this.children = [];
  this._childLinkData = {};
}

// Must be internal for new Node creation
// Copy this dag returning a new DAG pointing to the same data with same structure.
function copy() {
  const nodes = [];
  const cnodes = [];
  const mapping = {};
  this.each(node => {
    nodes.push(node);
    const cnode = new Node(node.id, node.data);
    cnodes.push(cnode);
    mapping[cnode.id] = cnode;
  });

  cnodes.forEach((cnode, i) => {
    const node = nodes[i];
    cnode.children = node.children.map(c => mapping[c.id]);
  });

  if (this.id === undefined) {
    const root = new Node(undefined, undefined);
    root.children = this.children.map(c => mapping[c.id]);
  } else {
    return mapping[this.id];
  }
}

// Reverse
function reverse() {
  const nodes = [];
  const cnodes = [];
  const mapping = {};
  const root = new Node(undefined, undefined);
  this.each(node => {
    nodes.push(node);
    const cnode = new Node(node.id, node.data);
    cnodes.push(cnode);
    mapping[cnode.id] = cnode;
    if (!node.children.length) {
      root.children.push(cnode);
    }
  });
  cnodes.forEach((cnode, i) => {
    const node = nodes[i];
    node.children.map(c => {
      const cc = mapping[c.id];
      cc.children.push(cnode);
      const dat = node._childLinkData[c.id];
      if (dat) {
        cc._childLinkData[node.id] = dat;
      }
    });
  });
  
  return root.children.length > 1 ? root : root.children[0];
}

Node.prototype = {
  constructor: Node,
  childLinks: childLinks,
  copy: copy,
  count: count,
  depth: depth,
  descendants: descendants,
  each: eachDepth,
  eachAfter: eachAfter,
  eachBefore: eachBefore,
  eachBreadth: eachBreadth,
  eachChildLinks: eachChildLinks,
  eachLinks: eachLinks,
  equals: equals,
  every: every,
  height: height,
  links: links,
  reduce: reduce,
  reverse: reverse,
  roots: roots,
  some: some,
  sum: sum,
};
