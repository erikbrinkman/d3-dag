// Create a dag with stratified data
import Node from ".";
import verify from "./verify";

export default function() {
  let id = defaultId;
  let parentIds = defaultParentIds;
  let linkData = defaultLinkData;

  function dagStratify(data) {
    if (!data.length) throw new Error("can't stratify empty data");
    const nodes = data.map((datum, i) => {
      const node = new Node(id(datum, i).toString(), datum);
      return node;
    });

    const mapping = {};
    nodes.forEach((node) => {
      if (mapping[node.id]) {
        throw new Error("found a duplicate id: " + node.id);
      } else {
        mapping[node.id] = node;
      }
    });

    const root = new Node(undefined, undefined);
    nodes.forEach((node) => {
      const pids = parentIds(node.data) || [];
      pids.forEach((pid) => {
        const parent = mapping[pid];
        if (!parent) throw new Error("missing id: " + pid);
        parent.children.push(node);
        parent._childLinkData.push(linkData(parent.data, node.data));
        return parent;
      });
      if (!pids.length) {
        root.children.push(node);
      }
    });

    verify(root);
    return root.children.length > 1 ? root : root.children[0];
  }

  dagStratify.id = function(x) {
    return arguments.length ? ((id = x), dagStratify) : id;
  };

  dagStratify.parentIds = function(x) {
    return arguments.length ? ((parentIds = x), dagStratify) : parentIds;
  };

  dagStratify.linkData = function(x) {
    return arguments.length ? ((linkData = x), dagStratify) : linkData;
  };

  return dagStratify;
}

function defaultId(d) {
  return d.id;
}

function defaultParentIds(d) {
  return d.parentIds;
}

function defaultLinkData() {
  return {};
}
