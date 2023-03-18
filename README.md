# d3-dag

[![npm](https://img.shields.io/npm/v/d3-dag.svg)](https://www.npmjs.com/package/d3-dag)
[![build](https://github.com/erikbrinkman/d3-dag/workflows/build/badge.svg)](https://github.com/erikbrinkman/d3-dag/actions)
[![docs](https://img.shields.io/badge/docs-docs-informational)](https://erikbrinkman.github.io/d3-dag/)

Often data sets are hierarchical, but are not in a tree structure, such as genetic data.
In these instances `d3-hierarchy` may not suit your needs, which is why `d3-dag` (Directed Acyclic Graph) exists.
This module implements a data structure for manipulating DAGs.
Old versions were designed to mimic `d3-hierarchy`'s api as much as possible, newer versions have opted to use modern javascript conventions while breaking from the standard set by d3.


## Examples

* [Javascript API](https://erikbrinkman.github.io/d3-dag/modules/index.html) - methods exported to flat javascript
- [Observable with Sugiyama Layout](https://beta.observablehq.com/@erikbrinkman/d3-dag-sugiyama) - Allows you to experiment with different layouts and different datasets for the sugiyama layout to understand the effects of different options.
- [Observable with Topological Layouts](https://beta.observablehq.com/@erikbrinkman/d3-dag-topological) - Allows you to experiment with different layouts and different datasets for topological layouts.
- [Codepen with Sugiyama Layout](https://codepen.io/brinkbot/pen/oNZJXqK) - For people who want a straight javascript example without the Observable fanciness.
- [Expandable Family Tree](https://github.com/BenPortner/js_family_tree) - An expandable family tree rendered using d3-dag.


## Installing

If you use node, `npm i d3-dag` or `yarn add d3-dag`.
Otherwise you can load it using `unpkg`:

```html
<script src="https://unpkg.com/d3-dag@0.11.1"></script>
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
const stratify = dagStratify();
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
