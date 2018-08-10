// Get an array of all links to children
export default function() {
  const links = [];
  this.eachChildLinks(l => links.push(l));
  return links;
}
