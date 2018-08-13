// Order nodes such that the total number of crossings is minimized
import solver from "javascript-lp-solver";

const crossings = "crossings";

function key(...nodes) {
  return nodes.map(n => n.id).sort().join("\0\0");
}

function perms(model, layer) {
  layer.sort((n1, n2) => (n1.id > n2.id) || -1);

  layer.slice(0, layer.length - 1).forEach((n1, i) => layer.slice(i + 1).forEach(n2 => {
    const pair = key(n1, n2);
    model.ints[pair] = 1;
    model.constraints[pair] = {max: 1};
    model.variables[pair] = {[pair]: 1};
  }));

  layer.slice(0, layer.length - 1).forEach((n1, i) => layer.slice(i + 1).forEach((n2, j) => {
    const pair1 = key(n1, n2);
    layer.slice(i + j + 2).forEach(n3 => {
      const pair2 = key(n1, n3);
      const pair3 = key(n2, n3);

      const triangleUp = key(n1, n2, n3, "+");
      model.constraints[triangleUp] = {max: 1};
      model.variables[pair1][triangleUp] = 1;
      model.variables[pair2][triangleUp] = -1;
      model.variables[pair3][triangleUp] = 1;

      const triangleDown = key(n1, n2, n3, "-");
      model.constraints[triangleDown] = {min: 0};
      model.variables[pair1][triangleDown] = 1;
      model.variables[pair2][triangleDown] = -1;
      model.variables[pair3][triangleDown] = 1;
    });
  }));
}

function cross(model, layer) {
  layer.slice(0, layer.length - 1).forEach((p1, i) => layer.slice(i + 1).forEach(p2 => {
    const pairp = key(p1, p2);
    p1.children.forEach(c1 => p2.children.filter(c => c !== c1).forEach(c2 => {
      const pairc = key(c1, c2);
      const slack = [pairp, pairc].join("\0\0\0");
      const slackUp = slack + "\0\0\0+";
      const slackDown = slack + "\0\0\0-";
      model.variables[slack] = {[slackUp]: 1, [slackDown]: 1, [crossings]: 1};

      const flip = +(c1.id > c2.id);
      const sign = flip || -1;

      model.constraints[slackUp] = {min: flip};
      model.variables[pairp][slackUp] = 1;
      model.variables[pairc][slackUp] = sign;

      model.constraints[slackDown] = {min: -flip};
      model.variables[pairp][slackDown] = -1;
      model.variables[pairc][slackDown] = -sign;
    }));
  }));
}

export default function() {
  
  function decrossOpt(layers) {
    // Initialize model
    const model = {
      optimize: crossings,
      optType: "min",
      constraints: {},
      variables: {},
      ints: {},
    };

    // Add variables and permutation invariants
    layers.forEach(lay => perms(model, lay));

    // Add crossing minimization
    layers.slice(0, layers.length - 1).forEach(lay => cross(model, lay));

    // Solve objective
    const ordering = solver.Solve(model);

    // Sort layers
    layers.forEach(layer => layer.sort((n1, n2) => ((n1.id > n2.id) || -1) * (ordering[key(n1, n2)] || -1)));

    return layers;
  }

  return decrossOpt;
}
