// Assign a layer value for each node that minimizes the number of dummy nodes that need to be added
import solver from "javascript-lp-solver";

export default function() {
  let debug = false;

  function layeringSimplex(dag) {
    // use null prefixes to prevent clash
    const prefix = debug ? "" : "\0";
    const delim = debug ? " -> " : "\0";

    const variables = {};
    const ints = {};
    const constraints = {};
    dag.each((node) => {
      const nid = `${prefix}${node.id}`;
      ints[nid] = 1;
      const variable = (variables[nid] = { opt: node.children.length });
      node.children.forEach((child) => {
        const edge = `${node.id}${delim}${child.id}`;
        constraints[edge] = { min: 1 };
        variable[edge] = -1;
      });
    });
    dag.each((node) => {
      node.children.forEach((child) => {
        const variable = variables[`${prefix}${child.id}`];
        variable.opt--;
        variable[`${node.id}${delim}${child.id}`] = 1;
      });
    });
    const assignment = solver.Solve({
      optimize: "opt",
      opType: "max",
      constraints: constraints,
      variables: variables,
      ints: ints
    });
    // lp solver doesn't assign some zeros
    dag.each((n) => (n.layer = assignment[`${prefix}${n.id}`] || 0));
    return dag;
  }

  layeringSimplex.debug = function(x) {
    return arguments.length ? ((debug = x), layeringSimplex) : debug;
  };

  return layeringSimplex;
}
