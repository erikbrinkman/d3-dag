// Assign a layer value for each node that minimizes the number of dummy nodes that need to be added
import solver from "javascript-lp-solver";

const delim = "\0";

export default function(dag) {
  // use null prefixes to prevent clash
  const variables = {};
  const ints = {};
  const constraints = {};
  dag.each(node => {
    const nid = `${delim}${node.id}`;
    ints[nid] = 1;
    const variable = variables[nid] = {opt: node.children.length};
    node.children.forEach(child => {
      const edge = `${node.id}${delim}${child.id}`;
      constraints[edge] = {"min": 1};
      variable[edge] = -1;
    });
  });
  dag.each(node => {
    node.children.forEach(child => {
      const variable = variables[`${delim}${child.id}`];
      variable.opt--;
      variable[`${node.id}${delim}${child.id}`] = 1;
    });
  });
  const assignment = solver.Solve({
    optimize: "opt",
    opType: "max",
    constraints: constraints,
    variables: variables,
    ints: ints,
  });
  // lp solver doesn't assign some zeros
  dag.each(n => n.layer = assignment[`\0${n.id}`] || 0);
  return dag;
}
