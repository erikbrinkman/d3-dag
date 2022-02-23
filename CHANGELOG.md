Changelog
=========

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A way to specify node data for the `connect` operator.
- Node and link level customizations to the `quad` operator allowing one to specify certain edges be more vertical.
- All of the internals of `sugiyama` are exposed in the ES6 module api making it possible to selectively run or rerun different parts of the sugiyama layout. This may make incremental updates or interactivity easier.
- Add two-layer greedy to help improve two-layer layouts.
- `nchildren()` method to DagNodes which is more efficient than any of the current methods for getting the number of children.
- Add the ability to remove cycles from DAGs by marking links as reversed.

### Changed

- The somewhat internal `SugiData` object has been changed to `{ link: DagLink<...> }` from `{ source: DagNode<...>, target: DagNode<...> }`. This simplifies the object and makes it easier to access link data for dummy nodes.
- Various typings have been tweaked slightly to get better inference and clean up the messy types with more appropriate usage of `infer`.

### Removed

- The requirement that nodes only link to a child once. Note that layouts might
  not support multigraphs immediately.

## [0.9.0] - 2021-12-31

### Added

- A new grid based topological layout called `grid`.

### Changed

- Some exported operator interface names were renamed to include their type of operator in the name, e.g. `SimplexOperator` was renamed to `SimplexLayeringOperator`.
  This is to prevent future name conflicts and standardize the exported intreface as some operators already required the name change. 
- `zherebko` now functions similarly to `sugiyama` in that it handles a node size and includes that padding, rather than pushing coordinates right to 0,0.

### Removed
- In order to reduce bundle size, methods no longer return custom fluent iterables that allow mapping an reducing.
  You'll need to import a fluent iterable library of choice (e.g. [`lfi`](https://www.npmjs.com/package/lfi)).

## [0.8.0] - 2021-06-14

This update features a large rewrite of much of the library, and as a result has some new features coupled with a lot of breaking changes.
Most of the breaking changes are in the backend, so if you've only been using the bundled methods, most things should still work.

### Added

- All built-in decrossing operators now preserve the order of layers if there's nothing else to do.
- All built-in ecrossing operators now all have an option to (or always) minimize the distance between nodes that have a common parent or child.
- `decrossTwoLayer` does a bottom to top pass as well, and supports multiple passes.
- `nodeSize` is usable without checking for `SugiDummyNode` instances (now they're just undefined).
- `dagConnect` supports adding single nodes.
- `layeringSimplex` allows equality groups, these are similar to setting rank the same, but there's no ordering constraint between groups.
- Much better typescript typings, and better tests to ensure they make sense.

### Changed

- `twolayerMedian` and `twolayerMean` were merged into `twolayerAgg`.
  To get `twolayerMean` you now use `twolayerAgg().aggregator(aggMeanFactory)`.
- `sugiyama` and `zherebko` no longer return a dag, instead they just modify the dag that was passed in.
  This isn't that different from the old behavior as the old dag was always modified, but in typescript there's no assertion that x and y exist on the returned dag.
- `sugiyama().nodeSize` changed slightly.
  You used to have to check if the input extended `SugiDummyNode`, now you just check if it's undefined.
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

### Removed
- The arquint layout was removed.
  The removal makes me sad, but with the drastic rearchitecture of the library, supporting the arquint layout was too difficult.
  If possible, I would like to bring it back.

## [0.7.0] - 2021-05-03

### Added

- Now when creating a dag with `dagConnect` or `dagStratify` typescript will pick up the datatype actually passed in, rather than just what was defined when creating the operator.

### Changed

- In `decrossOpt` and `twolayerOpt` the clowntown option was replaced with the `large` option.
  This renaming should be more clear, and should fail more quickly, preventing people from running optimal decross algorithms on dags that are too big without knowing what's going on.
- The bundled outputs used to be in the `dist` folder, and now their in the `bundle` folder. Those paths shouldn't have been hard coded, and the new paths are updated in `package.json`, but if you did hardcode them, this will break.
- The minimum node version is 14.
- The `zherebko` method should produce better layouts, while running negligibly longer.

### Removed

- Explicit node ids were removed.
  The string id was necessary to detect loops and identical elements efficiently when iterating.
  ES6 Sets and Maps make this constraint unnecessary, and so it was removed.
  To fix the errors created, you'll need to go from accessing `node.id` to instead access `node.data.id` or whatever field was used for the id during creation.
  Note that `connect` and `stratify` still need ids to create the dag, and so still have their accessors, but `hierarchy` doesn't.
  Also note that because nodes don't take an id anymore, `connect` now produces nodes with data that stores the id, instead of undefined as before.
- Deprecated members `coordVert` and `coordMinCurve` were removed. Note that their layouts can still be achieved with `coordQuad`.

## [0.6.0] - 2020-12-19

### Changed

- The type parameters for the `SugiyamaOperator` were changed to only contain the operators.
  This only matters if you referenced  an operator with its types attached (e.g. `layout: SugiyamaOperator<NodeType, ...> = ...`). All of the individual attribute modifier functions retained their generic signatures.
-  The typing for most operators changed to more easily allow adding new typed
   attributes later on. `sugiyama` went from being typed like
   `sugiyama<NodeType, LayeringType, DecrossType, ...>` to
   `sugiyama<NodeType, { layering: LayeringType, decross: DecrosType, ... }>`.
   To update, you'll need to change these declarations.

## [0.5.0] - 2020-11-17

### Changed

- The sugiyama layout was entirely rewritten. Instead of defaulting to fitting
  nodes into [0, 1] in x and y, it now features a `nodeSize` accessor.  Nodes
  are spaced out to respect their nodeSizes, along x coordinates this is exact,
  the y coordinates will respect the max height in each layer. As a result of
  the this change, there is no longer a separation accessor, as the role of
  that was replaced by specifying node sizes.
- Instead of sugiyama layout just returning the laidout dag (nice for type
  script), it now return an object with the dag, as well as the width and
  height of the final dag, including "padding" for node sizes. The default size
  of dummy nodes is [0, 0]. To get back to almost the old behavior, you can
  still specify a `size`.  This will rescale everything, but still keep the
  outside padding.

## [0.4.0] - 2020-09-17

### Changed

- Now written in typescript.
- Instead of having `linkData` accessors, builders `stratify` and `hierarchy`
  now have either `children`/`parentIds` or `childrenData`/`parentData` that
  combine the children/parents with the data for the link. This builds link data
  into the design of the dag and removes the messy handling of the fact that
  data was tacked on.
- `points` was moved from a property on linkData to its own top level link
  property, since it's somewhat required to be there and shouldn't be mutating
  user supplied data.
- In arquint, the height ratio property was switched to an accessor to be more
  inline with other methods.
- Documention has moved from the README to inline, and a github pages generated
  by typedoc.
- Switched from npm to yarn.

### Removed

- `copy`, `reverse`, and `equal` have been removed as the new structure made
  them hard to support, as DAGs are viewed more immutably now. Support could
  potentially be added back.
- Some DAG methods likes `some` and `every` have been removed because they're
  better supported by the fulent iterators returned by `idescendants`.

## [0.2.0] - 2019-02-17

### Added

- `coordCenter` was added to replace `coordSpread`.

### Changed

- `dratify` was renamed to `dagStratify` and `dierarchy` was renamed to `dagHierarchy` in order to pollute the d3 namespace less.
- After running a `sugiyama` layout, the `points` attribute will always exist for every links data, and it now also contains the start and end points.
- `test/data` was moved to `examples`. This isn't technically part of the api, but it may break examples that required the old file location.
- Link data is created at dag creation time. This also isn't technically backwards compatible but might increase memory consumption.

### Removed

- `coordSpread` was removed in favor of `coordCenter` which produces a slightly better layout in the same amount of time.