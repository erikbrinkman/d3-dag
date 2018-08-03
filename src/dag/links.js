// Return an array of all of the links in a dag
export default function() {
  const links = [];
  this.each(n => links.push(...n.childLinks()));
  return links;
}
