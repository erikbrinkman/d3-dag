# d3-dag

[![npm](https://img.shields.io/npm/v/d3-dag.svg)](https://www.npmjs.com/package/d3-dag)
[![build](https://github.com/erikbrinkman/d3-dag/workflows/build/badge.svg)](https://github.com/erikbrinkman/d3-dag/actions)
[![docs](https://img.shields.io/badge/docs-docs-informational)](https://erikbrinkman.github.io/d3-dag/)

Often data sets are hierarchical, but are not in a tree structure, such as genetic data.
In these instances `d3-hierarchy` may not suit your needs, which is why `d3-dag` (Directed Acyclic Graph) exists.
This module implements a data structure for manipulating DAGs.
Old versions were designed to mimic `d3-hierarchy`'s api as much as possible, newer versions have opted to use modern javascript conventions while breaking from the standard set by d3.


## Examples

- [Observable with Sugiyama Layout](https://beta.observablehq.com/@erikbrinkman/d3-dag-sugiyama) - Allows you to experiment with different layouts and different datasets for the sugiyama layout to understand the effects of different options.
- [Observable with Topological Layouts](https://beta.observablehq.com/@erikbrinkman/d3-dag-topological) - Allows you to experiment with different layouts and different datasets for topological layouts.
- [Codepen with Sugiyama Layout](https://codepen.io/brinkbot/pen/oNZJXqK) - For people who want a straight javascript example without the Observable fanciness.
- [Expandable Family Tree](https://github.com/BenPortner/js_family_tree) - An expandable family tree rendered using d3-dag.


## Installing

If you use node, `npm i d3-dag` or `yarn add d3-dag`.
Otherwise you can load it using `unpkg`:

```html
<script src="https://unpkg.com/d3-dag@0.10.0"></script>
<script>
const dag = d3.dagStratify(...);
const layout = d3.sugiyama();
layout(dag);
// ... render dag
</script>
```

## API Reference

* [Javascript API](https://erikbrinkman.github.io/d3-dag/modules/index.html) - methods exported to flat javascript
* [DAG](https://erikbrinkman.github.io/d3-dag/interfaces/dag.Dag.html) - documentation on the DAG structure
* Creating DAGs from data
  * [Hierarchy](https://erikbrinkman.github.io/d3-dag/interfaces/dag_create.HierarchyOperator.html) - data in dag format
  * [Stratify](https://erikbrinkman.github.io/d3-dag/interfaces/dag_create.StratifyOperator.html) - data in tabular format
  * [Connect](https://erikbrinkman.github.io/d3-dag/interfaces/dag_create.ConnectOperator.html) - data in edge format
* Layout algorithms
  * [Sugiyama](https://erikbrinkman.github.io/d3-dag/interfaces/sugiyama.SugiyamaOperator.html) - standard layout
  * [Zherebko](https://erikbrinkman.github.io/d3-dag/interfaces/zherebko.ZherebkoOperator.html) - topological layout
  * [Grid](https://erikbrinkman.github.io/d3-dag/interfaces/grid.GridOperator.html) - grid based topological layout

## General Usage Notes

This library is built around the concept of operators.
Operators are functions with a fluent interface to modify their behavior.
Every function that modifies behavior returns a copy, and will not modify the original operator.
For example, the `stratify` operator creates dags from id-based parent data, can ve used like so:

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

### Node Sizes

It can be useful to set a custom node size for the layout.
There is an important detail to node sizes that can be easy to miss, namely that "dummy nodes" or nodes that represent part of a long edge also have a custom size.
If setting `sugiyama`'s `nodeSize` accessor, make sure to handle the case when the node being sized is `undefined` if you want to mimic the default behavior but with custom sizes you probably want to use something like `.nodeSize(node => node === undefined ? [0, 0] : <my node size>)`.
To get even more flexible layouts, check `sugiNodeSize`.

### Typescript Notes

- Default operators will expect the necessary types for them to work, but will also do runtime checks in case javascript users use them inappropriately.
- Due to what seems like a bug in typescript, passing operators that take no arguments, e.g. `dagStratify().id(() => "")` will cause typescript to infer the data as `undefined`, which will then restrict the overall data-type to never in most circumstances.
  If you encounter typescript errors saying types can't be assigned to `never` check that the appropraite types are being inferred from custom operators and accessors.


## Experimental ES6 Imports

As of version 0.7, the full typescript build is released in the `dist` folder. That means in addition to importing from the bundled es6 module that was available before, you should be able to import arbitrary nested modules from `d3-dag/dist/...`. There may be issues with doing this, but it is at least an option. If people report success importing once private members from this more structured interface it may become stable.

## Updating

For information about changes between releases see the [`changelog`](CHANGELOG.md).

## Contributing

Contributions, issues, and PRs are all welcome!
