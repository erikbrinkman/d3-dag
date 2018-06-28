import {eachBefore} from "./each";

export default function(nodes) {
  return eachBefore(nodes, n => n.depth = Math.max(0, ...n.parents.map(c => 1 + c.depth)));
}
