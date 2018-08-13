export default function() {
  
  function twolayerMean(topLayer, bottomLayer) {
    bottomLayer.forEach(node => {
      node._mean = 0.0;
      node._count = 0;
    });
    topLayer.forEach((n, i) => n.children.forEach(c => c._mean += (i - c._mean) / ++c._count));
    bottomLayer.sort((a, b) => a._mean - b._mean);
    bottomLayer.forEach(node => {
      delete node._mean;
      delete node._count;
    });
  }

  return twolayerMean;
}
