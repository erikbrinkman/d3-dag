// TODO Add reduce and eachLinks
import ancestors from "./ancestors";
import count from "./count";
import depth from "./depth";
import descendants from "./descendants";
import eachAfter from "./eachAfter";
import eachBefore from "./eachBefore";
import eachBreadth from "./eachBreadth";
import eachDepth from "./eachDepth";
import equals from "./equals";
import every from "./every";
import height from "./height";
import links from "./links";
import some from "./some";
import sum from "./sum";

export default function Node(id, data) {
  this.id = id;
  this.data = data;
  this._childLinkData = {};
}

function nodeEachDepth(func) {
  eachDepth([this], func);
  return this;
}

function nodeEachBreadth(func) {
  eachBreadth([this], func);
  return this;
}

function childLinks() {
  return this.children.map(c => ({
    source: this,
    target: c,
    data: this._childLinkData[c.id] || (this._childLinkData[c.id] = {}),
  }));
}

Node.prototype = {
  constructor: Node,
  ancestors: ancestors,
  childLinks: childLinks,
  count: count,
  depth: depth,
  descendants: descendants,
  each: nodeEachDepth,
  eachAfter: eachAfter,
  eachBefore: eachBefore,
  eachBreadth: nodeEachBreadth,
  equals: equals,
  every: every,
  height: height,
  links: links,
  some: some,
  sum: sum,
};
