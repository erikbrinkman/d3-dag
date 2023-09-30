# d3-dag

[![npm](https://img.shields.io/npm/v/d3-dag.svg)](https://www.npmjs.com/package/d3-dag)
[![build](https://github.com/erikbrinkman/d3-dag/workflows/build/badge.svg)](https://github.com/erikbrinkman/d3-dag/actions)
[![docs](https://img.shields.io/badge/docs-docs-informational)](https://erikbrinkman.github.io/d3-dag/modules.html)

Often data sets are hierarchical, but are not in a tree structure, such as genetic data.
In these instances `d3-hierarchy` may not suit your needs, which is why `d3-dag` (Directed Acyclic Graph) exists.
This module implements a data structure for manipulating DAGs.
Old versions were designed to mimic `d3-hierarchy`'s api as much as possible, newer versions have opted to use modern javascript conventions while breaking from the standard set by d3.

## Examples

- **Sugiyama** [[codepen](https://codepen.io/brinkbot/pen/oNQwNRv)] [[observable](https://observablehq.com/@erikbrinkman/d3-dag-sugiyama)] [[api](https://erikbrinkman.github.io/d3-dag/functions/sugiyama-1.html)] - a robust layered layout
- **Zherebko** [[codepen](https://codepen.io/brinkbot/pen/dyQRPMY)] [[observable](https://observablehq.com/d/9ce02b308bb2b138)] [[api](https://erikbrinkman.github.io/d3-dag/functions/zherebko-1.html)] - a linear topological layout
- **Grid** [[codepen](https://codepen.io/brinkbot/pen/eYQRmzx)] [[observable](https://observablehq.com/@erikbrinkman/d3-dag-topological)] [[api](https://erikbrinkman.github.io/d3-dag/functions/grid-1.html)] - a grid based topological layout
- **Dynamic** [[codepen](https://codepen.io/brinkbot/pen/dyQRPpG)] - a dynamic sugiyama layout, click on nodes to activate or deactivate them

## Status

> :warning: **tl;dr** this is effectively in light maintanence mode: simple feature requests may still be implemented, but I won't be trying to expand to new use cases

This project started years ago with the intention of providing a rough
framework for implementing or extending a sugiyama-style layout for small to
medium sized static DAGs. At the time, this was one of the only libraries to
support layered graph layouts in javascript. Since then many more libraries
exist, and since I no longer use it, it's been hard to actively develop.

In addition, I started this mostly for experimentation purposes, but most
people just want something reasonable out of the box, that works for most
inputs. Fully supporting that would take a different library, but fortunately
there are several: (Note this list may not be up to date, but PRs are welcome)

- [graphology](https://www.npmjs.com/package/graphology) - a general javascript
  graph library that's similar to the graph implementation provided as part of
  this library.
- [sigma](https://www.npmjs.com/package/sigma) - a graph layout library
  specifically targeted at large graphs.

## Installing

If you use node, `npm i d3-dag` or `yarn add d3-dag`.
Otherwise you can load it using `unpkg`:

```html
<script src="https://unpkg.com/d3-dag@1.1.0"></script>
<script>
const dag = d3.graphStratify(...);
const layout = d3.sugiyama();
layout(dag);

// ... actually render here ...
for (const node of dag.nodes()) {
  console.log(node.x, node.y);
}
for (const { points } of dag.links()) {
  console.log(points);
}

</script>
```

## General Usage Notes

This library is built around the concept of operators.
Operators are functions with a fluent interface to modify their behavior.
Every function that modifies behavior returns a copy, and will not modify the original operator.
For example, the `stratify` operator creates dags from id-based parent data, can be used like so:

```ts
// note initial function call with no arguments to create default operator
const stratify = graphStratify();
const dag = stratify([{ id: "parent" }, { id: "child", parentIds: ["parent"] }]);

stratify.id(({ myid }: { myid: string }) => myid);
// doesn't work, stratify was not modified
const dag = stratify([{ myid: "parent" }, { myid: "child", parentIds: ["parent"] }]);

const myStratify = stratify.id(({ myid }: { myid: string }) => myid);
// works!
const dag = myStratify([{ myid: "parent" }, { myid: "child", parentIds: ["parent"] }]);
```

## Updating

For information about changes between releases see the [`changelog`](CHANGELOG.md).

## Contributing

Contributions, issues, and PRs are all welcome!
