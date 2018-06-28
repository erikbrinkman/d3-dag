import {eachAfter} from "./each";

export default function(nodes) {
  return eachAfter(nodes, n => n.height = Math.max(0, ...n.children.map(c => 1 + c.height)));
}
