import { SugiNode } from "../utils";

export function getParents(layer: SugiNode[]): Map<SugiNode, SugiNode[]> {
  const parents = new Map<SugiNode, SugiNode[]>();
  for (const par of layer) {
    for (const child of par.ichildren()) {
      const pars = parents.get(child);
      if (pars === undefined) {
        parents.set(child, [par]);
      } else {
        pars.push(par);
      }
    }
  }
  return parents;
}
