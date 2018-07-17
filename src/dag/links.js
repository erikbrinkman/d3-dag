export default function() {
  const links = [];
  this.eachDepth(n => links.push(...n.childLinks()));
  return links;
}
