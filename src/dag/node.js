import {ancestors, descendants} from "./relatives";
// FIXME Possible to make dag node array an object that both functions as an
// array, and has special dag functions. I think we just need to deleage array methods, and otherwise it can be a normal object with all of these methods.
// FIXME Also implement something like hierarchy links() that store additional data {source: , target:, data:}, and this is where we'll have dagre store extra points.
// FIXME It's unclear how some node properties from d3_hierarchy should extend
// to dags as individual root nodes don't encompass the whole data... e.g. sum

export function Node(id, data) {
  this.id = id;
  this.data = data;
}

Node.prototype = {
  constructor: Node,
  ancestors: ancestors,
  descendants: descendants,
};
