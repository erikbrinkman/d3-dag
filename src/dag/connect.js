// Create a dag with edge data
import { default as dagStratify } from "./stratify";

export default function() {
  let sourceAccessor = defaultSource;
  let targetAccessor = defaultTarget;

  function dagEdges(data) {
    if (!data.length) throw new Error("can't create graph from empty data");
    const keyedData = {};
    data.forEach((datum) => {
      const source = sourceAccessor(datum);
      const target = targetAccessor(datum);
      keyedData[source] || (keyedData[source] = {id: source, parentIds: []});
      const node = keyedData[target] || (keyedData[target] = {id: target, parentIds: []});
      node.parentIds.push(source);
    });
    return dagStratify()(Object.values(keyedData));
  }

  return dagEdges;
}

function defaultSource(d) {
  return d[0];
}

function defaultTarget(d) {
  return d[1];
}
