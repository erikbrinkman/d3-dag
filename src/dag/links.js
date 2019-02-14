// Return an array of all of the links in a dag
export default function() {
  const links = [];
  this.eachLinks((l) => links.push(l));
  return links;
}
