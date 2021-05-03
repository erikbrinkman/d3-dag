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
- [Examples with Arquint Layout](https://observablehq.com/@arquintl/d3-dag-arquint) - Allows you to experiment with different layouts and different datasets for the arquint layout.
- [Expandable Family Tree](https://github.com/BenPortner/js_family_tree) - An expandable family tree rendered using d3-dag.


## Installing

If you use node, `npm i d3-dag` or `yarn add d3-dag`.
Otherwise you can load it using `unpkg`:

```html
<script src="https://unpkg.com/d3-dag@0.6.0"></script>
<script>

var dag = d3.sugiyama();

</script>
```

## API Reference

> :warning: **Documentation links aren't consistent**: Due to the evolving nature of tsdoc and typedoc, internal linking between various points in the codebase doesn't work well.
> Notably, it's currently impossible to differentiate linking between two symbols with the same name.
> While there are workarounds, they are painful. Until this is addressed in typedoc, it's unlikely the documentation will be fixed.

* [Javascript API](https://erikbrinkman.github.io/d3-dag/modules/index.html) - methods exported to flat javascript
* [DAG](https://erikbrinkman.github.io/d3-dag/modules/dag_node.html) - documentation on the DAG structure
* Creating DAGs from data
  * [Hierarchy](https://erikbrinkman.github.io/d3-dag/modules/dag_hierarchy.html) - data in dag format
  * [Stratify](https://erikbrinkman.github.io/d3-dag/modules/dag_stratify.html) - data in tabular format
  * [Connect](https://erikbrinkman.github.io/d3-dag/modules/dag_connect.html) - data in edge format
* Layout algorithms
  * [Sugiyama](https://erikbrinkman.github.io/d3-dag/modules/sugiyama.html) - standard layout
  * [Zherebko](https://erikbrinkman.github.io/d3-dag/modules/zherebko.html) - topological layout
  * [Arquint](https://erikbrinkman.github.io/d3-dag/modules/arquint.html) - variable sized nodes

## Experimental ES6 Imports

As of version 0.7, the full typescript build is released in the `dist` folder. That means in addition to importing from the bundled es6 module that was available before, you should be able to import arbitrary nested modules from `d3-dag/dist/...`. There may be issues with doing this, but it is at least an option. If people report success importing once private members from this more structured interface it may become stable.

## Updating

Information for major changes between releases

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
