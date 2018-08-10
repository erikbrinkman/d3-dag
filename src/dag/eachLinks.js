// Call a function on each link in the dag
export default function(func) {
  let i = 0;
  this.each(n => n.eachChildLinks(l => func(l, i++)));
  return this;
}
