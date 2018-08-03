import solver from "javascript-lp-solver";

export default function(dag) {
  // use null prefixes to prevent clash
  const variables = {};
  const ints = {};
  const constraints = {};
  dag.each(node => {
    const nid = `\0${node.id}`;
    ints[nid] = 1;
    const variable = variables[nid] = {opt: node.parents.length - node.children.length};
    node.parents.forEach(parent => {
      variable[`${parent.id}\0${node.id}`] = 1;
    });
    node.children.forEach(child => {
      const edge = `${node.id}\0${child.id}`;
      constraints[edge] = {"min": 1};
      variable[edge] = -1;
    });
  });
  const assignment = solver.Solve({
    optimize: "opt",
    opType: "min",
    constraints: constraints,
    variables: variables,
    ints: ints,
  });
  // lp solver doesn't assign some zeros
  dag.each(n => n.layer = assignment[`\0${n.id}`] || 0);
}
