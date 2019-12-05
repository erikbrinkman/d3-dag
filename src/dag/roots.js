// Return the roots of the current dag
export default function roots() {
  return this.id === undefined ? this.children.slice() : [this];
}
