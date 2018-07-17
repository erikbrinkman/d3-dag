import Dag from "./index";
import Node from "./node";
import verify from "./verify";

export default function() {
  let id = defaultId,
    parentIds = defaultParentIds;

  function dagStratify(data) {
    const nodes = data.map((datum, i) => {
      const node = new Node(id(datum, i).toString(), datum);
      node.children = [];
      return node;
    });

    const mapping = {};
    nodes.forEach(node => {
      if (mapping[node.id]) {
        throw new Error("found a duplicate id: " + node.id);
      } else {
        mapping[node.id] = node;
      }
    });

    const roots = [];
    nodes.forEach(node => {
      node.parents = (parentIds(node.data) || []).map(pid => {
        const parent = mapping[pid];
        if (!parent) throw new Error("missing id: " + pid);
        parent.children.push(node);
        return parent;
      });
      if (!node.parents.length) {
        roots.push(node);
      }
    });

    verify(roots);
    return new Dag(roots);
  }

  dagStratify.id = function(x) {
    return arguments.length ? (id = x, dagStratify) : id;
  }

  dagStratify.parentIds = function(x) {
    return arguments.length ? (parentIds = x, dagStratify) : parentIds;
  }

  return dagStratify;
}

function defaultId(d) {
  return d.id;
}

function defaultParentIds(d) {
  return d.parentIds;
}
