import {eachBefore} from "./dag/each";

export default function topologicalSort(nodes) {
  let index = 0;
  return eachBefore(nodes, n => n.value = index++);
}
