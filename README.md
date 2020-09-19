# d3-dag

[![npm](https://img.shields.io/npm/v/d3-dag.svg)](https://www.npmjs.com/package/d3-dag)
[![build](https://github.com/erikbrinkman/d3-dag/workflows/build/badge.svg)](https://github.com/erikbrinkman/d3-dag/actions)
[![docs](https://img.shields.io/badge/docs-docs-informational)](https://erikbrinkman.github.io/d3-dag/)

Often data sets are hierarchical, but are not in a tree structure, such as genetic data.
In these instances `d3-hierarchy` may not suit your needs, which is why `d3-dag` (Directed Acyclic Graph) exists.
This module implements a data structure for manipulating DAGs.
Old versions were designed to mimic `d3-hierarchy`'s api as much as possible, newer versions have opted to use modern javascript conventions while breaking from the standard


## Examples

- [Examples with Sugiyama Layout](https://beta.observablehq.com/@erikbrinkman/d3-dag-sugiyama) - Allows you to experiment with different layouts and different datasets for the sugiyama layout.
- [Examples with Topological Layout](https://beta.observablehq.com/@erikbrinkman/d3-dag-topological) - Allows you to experiment with different layouts and different datasets for topological layouts.
- [Example with Arrows](https://observablehq.com/@erikbrinkman/d3-dag-sugiyama-with-arrows) - This example shows a simple, if inexact, way to render edge arrows with d3.
- [Examples with Arquint Layout](https://observablehq.com/@arquintl/d3-dag-arquint) - Allows you to experiment with different layouts and different datasets for the arquint layout.
- [Expandable Family Tree](https://github.com/BenPortner/js_family_tree) - An expandable family tree rendered using d3-dag.


## Installing

If you use NPM, `npm i d3-dag`.
Otherwise you can load it using `unpkg`:

```html
<script src="https://unpkg.com/d3-dag@0.4.3"></script>
<script>

var dag = d3.sugiyama();

</script>
```

## API Reference

* [Javascript API](https://erikbrinkman.github.io/d3-dag/modules/_index_.html) - methods exported to flat javascript
* [DAG](https://erikbrinkman.github.io/d3-dag/modules/_dag_node_.html) - documentation on the DAG structur
* Creating DAGs from data
  * [Hierarchy](https://erikbrinkman.github.io/d3-dag/modules/_dag_hierarchy_.html) - data in dag format
  * [Stratify](https://erikbrinkman.github.io/d3-dag/modules/_dag_stratify_.html) - data in tabular format
  * [Connect](https://erikbrinkman.github.io/d3-dag/modules/_dag_connect_.html) - data in edge format
* Layout algorithms
  * [Sugiyama](https://erikbrinkman.github.io/d3-dag/modules/_sugiyama_index_.html) - standard layout
  * [Zherebko](https://erikbrinkman.github.io/d3-dag/modules/_zherebko_index_.html) - topological layout
  * [Arquint](https://erikbrinkman.github.io/d3-dag/modules/_arquint_index_.html) - variable sized nodes

## Updating

Information for major changes between releases

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
