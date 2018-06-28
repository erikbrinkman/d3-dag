import {Node} from "./node";
import {default as verify} from "./verify";

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
    nodes.forEach(node => {
      node.parents = (parentIds(node.data) || []).map(pid => {
        const parent = mapping[pid];
        if (!parent) throw new Error("missing id: " + pid);
        parent.children.push(node);
        return parent;
      });
    });

    const msg = verify(nodes);
    if (msg) throw new Error(msg);
    return nodes;
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
