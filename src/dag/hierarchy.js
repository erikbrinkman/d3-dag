// Create a dag from a hierarchy representation
import Node from ".";
import verify from "./verify";

export default function() {
  let id = defaultId;
  let children = defaultChildren;

  function dierarchy(...data) {
    if (!data.length) throw new Error("must pass at least one node");
    const mapping = {};
    const queue = [];

    function nodify(datum) {
      const did = id(datum).toString();
      let res;
      if (!(res = mapping[did])) {
        res = new Node(did, datum);
        queue.push(res);
        mapping[did] = res;
      } else if (datum !== res.data) {
        throw new Error("found a duplicate id: " + did);
      }
      return res;
    }

    const root = new Node(undefined, undefined);
    let node;
    root.children = data.map(nodify);
    while (node = queue.pop()) {
      node.children = (children(node.data) || []).map(nodify);
    }

    verify(root);
    return root.children.length > 1 ? root : root.children[0];
  }

  dierarchy.id = function(x) {
    return arguments.length ? (id = x, dierarchy) : id;
  }

  dierarchy.children = function(x) {
    return arguments.length ? (children = x, dierarchy) : children;
  }

  return dierarchy;
}

function defaultId(d) {
  return d.id;
}

function defaultChildren(d) {
  return d.children;
}
