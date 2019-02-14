// Assign an index to links greedily
export default function() {
  function greedy(nodes) {
    const pos = [];
    const neg = [];

    nodes.forEach((node, layer) => {
      node
        .childLinks()
        .sort(({ target: a }, { target: b }) => a.layer - b.layer)
        .forEach(({ target, data }) => {
          if (target.layer === layer + 1) {
            data.index = 0;
          } else {
            const neg_index =
              (neg.findIndex((i) => i <= layer) + 1 || neg.length + 1) - 1;
            const pos_index =
              (pos.findIndex((i) => i <= layer) + 1 || pos.length + 1) - 1;
            if (neg_index < pos_index) {
              // Default right
              data.index = -neg_index - 1;
              neg[neg_index] = target.layer - 1;
            } else {
              data.index = pos_index + 1;
              pos[pos_index] = target.layer - 1;
            }
          }
        });
    });
  }

  return greedy;
}
