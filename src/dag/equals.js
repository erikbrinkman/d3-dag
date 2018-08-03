// Compare two dag_like objects for equality
// For dags to be equal, the data the nodes contain must be identical (===)
function intersect(obj, keys) {
  return keys.filter(k => obj[k]).reduce((o, k) => { o[k] = true; return o; }, {});
}

function info(dag_like) {
  const info = {};
  dag_like.each(node => info[node.id] = [
    node.data,
    node.children.map(n => n.id),
    node.parents.map(n => n.id),
  ]);
  Object.values(info).forEach(vals => {
    vals[1] = intersect(info, vals[1]);
    vals[2] = intersect(info, vals[2]);
  });
  return info;
}

function set_equal(a, b) {
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => b[k]);
}

export default function(that) {
  const this_info = info(this);
  const that_info = info(that);
  return Object.keys(this_info).length === Object.keys(that_info).length &&
    Object.entries(this_info).every(([nid, [this_data, this_children, this_parents]]) => {
      const val = that_info[nid];
      if (!val) return false;
      const [that_data, that_children, that_parents] = val;
      return this_data === that_data && set_equal(this_children, that_children) && set_equal(this_parents, that_parents);
    });
}
