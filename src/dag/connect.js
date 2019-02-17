// Create a dag with edge data
import { default as dagStratify } from "./stratify";

export default function() {
  let sourceAccessor = defaultSource;
  let targetAccessor = defaultTarget;
  let linkData = defaultLinkData;

  function stratifyLinkData(parent, child) {
    return linkData(child.linkData[parent.id]);
  }

  function dagConnect(data) {
    if (!data.length) throw new Error("can't create graph from empty data");
    const keyedData = {};
    data.forEach((datum) => {
      const source = sourceAccessor(datum);
      const target = targetAccessor(datum);
      keyedData[source] ||
        (keyedData[source] = { id: source, parentIds: [], linkData: {} });
      const node =
        keyedData[target] ||
        (keyedData[target] = { id: target, parentIds: [], linkData: {} });
      node.parentIds.push(source);
      node.linkData[source] = datum;
    });

    return dagStratify().linkData(stratifyLinkData)(Object.values(keyedData));
  }

  dagConnect.sourceAccessor = function(x) {
    return arguments.length
      ? ((sourceAccessor = x), dagConnect)
      : sourceAccessor;
  };

  dagConnect.targetAccessor = function(x) {
    return arguments.length
      ? ((targetAccessor = x), dagConnect)
      : targetAccessor;
  };

  dagConnect.linkData = function(x) {
    return arguments.length ? ((linkData = x), dagConnect) : linkData;
  };

  return dagConnect;
}

function defaultSource(d) {
  return d[0];
}

function defaultTarget(d) {
  return d[1];
}

function defaultLinkData(d) {
  return d;
}
