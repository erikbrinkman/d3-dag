import Dag from "./index";
import Node from "./node";
import verify from "./verify";

export default function() {
  let id = defaultId,
    children = defaultChildren;

  function dagHierarchy(...data) {
    const mapping = {};
    const queue = [];

    function nodify(datum) {
      const did = id(datum).toString();
      let res;
      if (!(res = mapping[did])) {
        res = new Node(did, datum);
        res.parents = [];
        queue.push(res);
        mapping[did] = res;
      } else if (datum !== res.data) {
        throw new Error("found a duplicate id: " + did);
      }
      return res;
    }

    const roots = data.map(nodify);
    let node;
    while (node = queue.pop()) {
      node.children = (children(node.data) || []).map(nodify);
      node.children.forEach(child => child.parents.push(node));
    }

    verify(roots);
    return new Dag(roots);
  }

  dagHierarchy.id = function(x) {
    return arguments.length ? (id = x, dagHierarchy) : id;
  }

  dagHierarchy.children = function(x) {
    return arguments.length ? (children = x, dagHierarchy) : children;
  }

  return dagHierarchy;
}

function defaultId(d) {
  return d.id;
}

function defaultChildren(d) {
  return d.children;
}
