import {ancestors, descendants} from "./relatives";
// FIXME Possible to make dag node array an object that both functions as an
// array, and has special dag functions.
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
