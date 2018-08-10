// Return the roots of the current dat
export default function roots() {
  return this.id === undefined ? this.children.slice() : [this];
}
