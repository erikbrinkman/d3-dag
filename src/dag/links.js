export default function() {
  const links = [];
  this.each(n => links.push(...n.childLinks()));
  return links;
}
