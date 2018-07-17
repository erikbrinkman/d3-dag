import Node from "../../dag/node";

export default function(dag) {
  const layering = [];
  dag.eachAfter(node => {
    node._layer = Math.max(0, ...node.children.map(n => n._layer + 1));
    const layer = layering[node._layer] || (layering[node._layer] = []);
    layer.push(node);
    node.children = node.children.map(child => {
      if (node._layer === child._layer + 1) {
        return child;
      }
      child.parents.splice(child.parents.indexOf(node), 1);
      let last = child;
      for (let l = child._layer + 1; l < node._layer; l++) {
        const dummy = new Node(`${node.id}\0${child.id}\0${l}`, undefined);
        dummy.children = [last];
        dummy.parents = [];
        layering[l].push(dummy);
        last.parents.push(dummy);
        last = dummy;
      }
      last.parents.push(node);
      return last;
    }); 
  });
  dag.eachDepth(n => delete n._layer);
  return layering.reverse();
}
