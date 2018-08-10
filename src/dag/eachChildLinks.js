// Call a function on each child link
export default function(func) {
  if (this.id !== undefined) {
    let i = 0;
    this.children.forEach(c => func({
      source: this,
      target: c,
      data: this._childLinkData[c.id] || (this._childLinkData[c.id] = {}),
    }, i++));
  }
  return this;
}
