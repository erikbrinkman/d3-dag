// Compare two dag_like objects for equality
function toSet(arr) {
  const set = {};
  arr.forEach((e) => (set[e] = true));
  return set;
}

function info(root) {
  const info = {};
  root.each(
    (node) =>
      (info[node.id] = [node.data, toSet(node.children.map((n) => n.id))]),
  );
  return info;
}

function setEqual(a, b) {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((k) => b[k])
  );
}

export default function(that) {
  const thisInfo = info(this);
  const thatInfo = info(that);
  return (
    Object.keys(thisInfo).length === Object.keys(thatInfo).length &&
    Object.entries(thisInfo).every(([nid, [thisData, thisChildren]]) => {
      const val = thatInfo[nid];
      if (!val) return false;
      const [thatData, thatChildren] = val;
      return thisData === thatData && setEqual(thisChildren, thatChildren);
    })
  );
}
