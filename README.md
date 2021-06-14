# d3-dag

[![npm](https://img.shields.io/npm/v/d3-dag.svg)](https://www.npmjs.com/package/d3-dag)
[![build](https://github.com/erikbrinkman/d3-dag/workflows/build/badge.svg)](https://github.com/erikbrinkman/d3-dag/actions)
[![docs](https://img.shields.io/badge/docs-docs-informational)](https://erikbrinkman.github.io/d3-dag/)

Often data sets are hierarchical, but are not in a tree structure, such as genetic data.
In these instances `d3-hierarchy` may not suit your needs, which is why `d3-dag` (Directed Acyclic Graph) exists.
This module implements a data structure for manipulating DAGs.
Old versions were designed to mimic `d3-hierarchy`'s api as much as possible, newer versions have opted to use modern javascript conventions while breaking from the standard set by d3.


## Examples

- [Examples with Sugiyama Layout](https://beta.observablehq.com/@erikbrinkman/d3-dag-sugiyama) - Allows you to experiment with different layouts and different datasets for the sugiyama layout.
- [Examples with Topological Layout](https://beta.observablehq.com/@erikbrinkman/d3-dag-topological) - Allows you to experiment with different layouts and different datasets for topological layouts.
- [Example with Arrows](https://observablehq.com/@erikbrinkman/d3-dag-sugiyama-with-arrows) - This example shows a simple, if inexact, way to render edge arrows with d3.
- [Expandable Family Tree](https://github.com/BenPortner/js_family_tree) - An expandable family tree rendered using d3-dag.


## Installing

If you use node, `npm i d3-dag` or `yarn add d3-dag`.
Otherwise you can load it using `unpkg`:

```html
<script src="https://unpkg.com/d3-dag@0.7.0"></script>
<script>
const dag = d3.dagStratify(...);
const layout = d3.sugiyama();
layout(dag);
// ... render dag
</script>
```

## API Reference

* [Javascript API](https://erikbrinkman.github.io/d3-dag/modules/index.html) - methods exported to flat javascript
* [DAG](https://erikbrinkman.github.io/d3-dag/modules/dag_node.html) - documentation on the DAG structure
* Creating DAGs from data
  * [Hierarchy](https://erikbrinkman.github.io/d3-dag/modules/dag_hierarchy.html) - data in dag format
  * [Stratify](https://erikbrinkman.github.io/d3-dag/modules/dag_stratify.html) - data in tabular format
  * [Connect](https://erikbrinkman.github.io/d3-dag/modules/dag_connect.html) - data in edge format
* Layout algorithms
  * [Sugiyama](https://erikbrinkman.github.io/d3-dag/modules/sugiyama.html) - standard layout
  * [Zherebko](https://erikbrinkman.github.io/d3-dag/modules/zherebko.html) - topological layout

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

### Typescript Notes

- Default operators will expect the necessary types for them to work, but will also do runtime checks in case javascript users use them inappropriately.
- Due to what seems like a bug in typescript, passing operators that take no arguments, e.g. `dagStratify().id(() => "")` will cause typescript to infer the data as `undefined`, which will then restrict the overall data-type to never in most circumstances.
  If you encounter typescript errors saying types can't be assigned to `never` check that the appropraite types are being inferred from custom operators and accessors.


## Experimental ES6 Imports

As of version 0.7, the full typescript build is released in the `dist` folder. That means in addition to importing from the bundled es6 module that was available before, you should be able to import arbitrary nested modules from `d3-dag/dist/...`. There may be issues with doing this, but it is at least an option. If people report success importing once private members from this more structured interface it may become stable.

## Updating

Information for major changes between releases

### Updating from 0.7 to 0.8

This update features a large rewrite of much of the library, and as a result has some new features coupled with a lot of breaking changes.
Most of the breaking changes are in the backend, so if you've only been using the bundled methods, most things should still work.
With this, the library is nearing stability, and I expected to release 1.0 soon

**Large Breaking Changes:**
- The largest breaking change was the removal of the arquint layout from this library.
  The removal makes me sad, but with the drastic rearchitecture of the library, supporting the arquint layout was too difficult.
  If possible, I would like to bring it back.
- `twolayerMedian` and `twolayerMean` were merged into `twolayerAgg`.
  To get `twolayerMean` you now use `twolayerAgg().aggregator(aggMeanFactory)`.
- `sugiyama` and `zherebko` no longer return a dag, instead they just modify the dag that was passed in.
  This isn't that different from the old behavior as the old dag was always modified, but in typescript there's no assertion that x and y exist on the returned dag.
- `sugiyama().nodeSize` changed slightly.
  You used to have to check if the input extended `SugiDummyNode`, now you just check if it's undefined.

**Minor Breaking Changes:**
These changes should only affect you if you were writing custom operators or using infrequent or experimental apis.
- The Typescript types are much more coherent, and should make much more sense.
  The old types had a lot of manual assertions and casting to get them to work, the new ones don't.
  Most mthods should just work now without the need of manual annotation.
- `LayeringOperators` now modify a node's `value` instead of setting a `layer` propery.
- The API for custom sugiyama operators has changed significantly. I don't think this API was actually used very frequently, but if you did, look at the new operator definitions. Roughly instead of having a `DummyNode` or the actual `DagNode`, you will have a `SugiDagNode` which is a normal dag node with node data that either has a single `node` attribute for normal nodes, or a `parent` and `child` attribute for dummy nodes.
- Many operator types were renamed from `Operator` in the appropriate module to a named operator like `TwolayerOperator`.
  This should only affect you if you were using the experimental ES6 module api.
- The build system was switched from rollup to esbuild.
  There was one error with the bundling that was caught in development, and is now being tested.
- The definition of Dag changed from being a union of `DagNode` and `DagRoot`, to just being a subset of `DagNode` without the local node operations.
  This is arguably a cleaner api, but will change the behavior of things like conditional types.
- The definition of `TwolayerOperator` must now support going bottom to top.
- Layout* (e.g. `LayoutDagNode`) has been completely isolated, so it's impossible to create dags manually without implementing the interface yourself.
  The purpose is to enforce that dags remain dags, and most operators can be do by clever application of the construction methods (see `sugify`).

**New features:**
- All built-in decrossing operators now preserve the order of layers if there's nothing else to do.
- All built-in ecrossing operators now all have an option to (or always) minimize the distance between nodes that have a common parent or child.
- `decrossTwoLayer` does a bottom to top pass as well, and supports multiple passes.
- `nodeSize` is usable without checking for `SugiDummyNode` instances (now they're just undefined).
- `dagConnect` supports adding single nodes.
- `layeringSimplex` allows equality groups, these are similar to setting rank the same, but there's no ordering constraint between groups.
- Much better typescript typings, and better tests to ensure they make sense.

### Updating from 0.6 to 0.7

There are a number of potentially breaking changes when upgrading from 0.6 to 0.7.
The first may be a big breaker, the the rest were for private apis or otherwise shouldn't have been used very often.
- The only large breaking change is the remove of node ids. Prior to 0.7, all nodes must have a string id.
  The string id was necessary to detect loops and identical elements efficiently when iterating.
  ES6 Sets and Maps make this constraint unnecessary, and so it was removed.
  To fix the errors created, you'll need to go from accessing `node.id` to instead access `node.data.id` or whatever field was used for the id during creation.
  Note that `connect` and `stratify` still need ids to create the dag, and so still have their accessors, but `hierarchy` doesn't.
  Also note that because nodes don't take an id anymore, `connect` now produces nodes with data that stores the id, instead of undefined as before.
- In `decrossOpt` and `twolayerOpt` the clowntown option was replaced with the `large` option.
  This renaming should be more clear, and should fail more quickly, preventing people from running optimal decross algorithms on dags that are too big without knowing what's going on.
- Deprecated members `coordVert` and `coordMinCurve` were removed. Note that their layouts can still be achieved with `coordQuad`.
- The bundled outputs used to be in the `dist` folder, and now their in the `bundle` folder. Those paths shouldn't have been hard coded, and the new paths are updated in `package.json`, but if you did hardcode them, this will break.
- Version 0.6 was tested on node 12, now the minimum node version is 14.

There were a few nobreaking updates:
- The `zherebko` method should be a bit better, while running negligibly longer.
- Now when creating a dag with `dagConnect` or `dagStratify` typescript will pick up the datatype actually passed in, rather than just what was defined when creating the operator.

### Updating from 0.5 to 0.6

The only breaking change happens if you happend to use this library in
typescript, and happened store an operator with its types attached (e.g. `layout:
SugiyamaOperator<NodeType, ...> = ...`). All of the individual attribute
modifier functions retained their generic signatures.

The typing for most operators changed to more easily allow adding new typed
attributes later on. `sugiyama` went from being typed like `sugiyama<NodeType,
LayeringType, DecrossType, ...>` to `sugiyama<NodeType, { layering:
LayeringType, decross: DecrosType, ... }>`. To update, you'll need to change
these declarations.

### Updating from 0.4 to 0.5

The way Sugiyama layout works was entirely rewritten. Instead of defaulting to
fitting nodes into [0, 1] in x and y, it now features a `nodeSize` accessor.
Nodes are spaced out to respect their nodeSizes, along x coordinates this is
exact, the y coordinates will respect the max height in each layer. As a result
of the this change, there is no longer a separation accessor, as the role of
that was replaced by specifying node sizes. Also, instead of sugiyama layout
just returning the laidout dag (nice for type script), it now return an object
with the dag, as well as the width and height of the final dag, including
"padding" for node sizes. The default size of dummy nodes is [0, 0]. To get
back to almost the old behavior, you can still specify a `size`. This will
rescale everything, but still keep the outside padding.

### Updating from 0.3 to 0.4

The update from 0.3 to 0.4 adds support for typescript, and makes a number of
backwards incompatible changes that arrise from the switch. Some are also the
result of cleaning up hasty early design decisions.

- Instead of having `linkData` accessors, builders `stratify` and `hierarchy`
  now have either `children`/`parentIds` or `childrenData`/`parentData` that
  combine the children/parents with the data for the link. The build link data
  into the design of the dag and removes the messy handling of the fact that
  data was tacked on.
- `points` was moved from a property on linkData to its own top level link
  property, since it's somewhat required to be there and shouldn't be mutating
  user supplied data.
- `copy`, `reverse`, and `equal` have been removed as the new structure made
  them hard to support, as DAGs are viewed more immutably now. Support could
  potentially be added back.
- Some DAG methods likes `some` and `every` have been removed because they're
  better supported by the fulent iterators returned by `idescendants`.
- In arquint, the height ratio property was switched to an accessor to be more
  inline with other methods.
- Documention has moved from the README to inline, and a github pages generated
  by typedoc.
- Switched from npm to yarn.


### Updating from 0.1 to 0.2

The update from 0.1 to 0.2 includes a few small backwards incompatible changes.

- `dratify` was renamed to `dagStratify` and `dierarchy` was renamed to `dagHierarchy` in order to pollute the d3 namespace less.
- After running a `sugiyama` layout, the `points` attribute will always exist for every links data, and it now also contains the start and end points.
- `coordSpread` was removed in favor of `coordCenter` which produces a slightly better layout in the same amount of time.
- `test/data` was moved to `examples`. This isn't technically part of the api, but it may break examples that required the old file location.
- Link data is created at dag creation time. This also isn't technically backwards compatible but might increase memory consumption.


## Contributing

Contributions, issues, and PRs are all welcome!
