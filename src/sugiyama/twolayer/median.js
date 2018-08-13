import { median } from "d3-array";

export default function() {
  
  function twolayerMedian(topLayer, bottomLayer) {
    bottomLayer.forEach(n => n._median = []);
    topLayer.forEach((n, i) => n.children.forEach(c => c._median.push(i)));
    bottomLayer.forEach(n => n._median = median(n._median) || 0);
    bottomLayer.sort((a, b) => a._median - b._median);
    bottomLayer.forEach(n => delete n._median);
  }

  return twolayerMedian;
}
