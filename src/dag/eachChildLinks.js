// Call a function on each child link
export default function(func) {
  if (this.id !== undefined) {
    let i = 0;
    this.children.forEach((c, j) =>
      func(
        {
          source: this,
          target: c,
          data: this._childLinkData[j]
        },
        i++
      )
    );
  }
  return this;
}
