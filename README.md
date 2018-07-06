# d3-dag

Often data sets are hierarchical, but are not in a tree structure, such as genetic data.
In these instances `d3-hierarchy` may not suit your needs, which is why `d3-dag` (Directed Acyclic Graph) exists.
This module implements a data structures for manipulating DAGs that mimics the API of `d3-hierarchy`.
In addition, it wraps `dagre`, a popular backend framework for laying out dags, so that it mimics the API found in `d3-hierarchy`, and supports other convenience methods for computing or laying out information that is encoded as a DAG.

## Notes

This is still an early release, and the API is far from stable.
Things that haven't been decided include:

1) How to handle links.
   These are currently stored in the root dag structure, and are modifiable by various methods.
   Should they be local to nodes?
   Should they store data?
   Should that data be able to be passed in at DAG creation?
2) How to handle multiple root nodes.
   Currently, there is a DAG object that encapsulates the links and nodes of the DAG allowing multiple roots / reversing of the DAG.
   This, however, creates a slightly different API than the one exposed by `d3-hierarchy` as the methods don't exist on the individual nodes, but on the holding structure.
   One possible alternative would be to implement the methods on the backend as always taking an array of root nodes.
   Each individual node's method can just call those with itself, and there can be a multi-node object that's returned at dag creation that functions much the way the DAG object does now, only it would only store the roots and delegate methods appropriately.
3) This currently wraps `dagre`, but I'd prefer to reimplement a DAG layout to not require it as a dependency, and to allow more options about the different phases of DAG layout.
   Ideally each phase will just be a callback, similar to the way other `d3` layouts are done.
4) The general API and method names might change as better options make sense.

## Installing

If you use NPM, `npm i d3-dag`.


```html
<script src="https://unpkg.com/d3-dag"></script>
<script>

var dag = d3.dagLayout();

</script>
```

[Try d3-dag in your browser.](https://tonicdev.com/npm/d3-dag)

## API Reference

* [Hierarchy](#dag_hierarchy) ([Stratify](#dag_stratify))
* [Topological Sort](#topological_sort)
* [DAG Layout](#dag_layout)

### DAG Hierarchy

Before you can compute a DAG layout, you need a DAG structure.
If your data is already in a DAG structure, you can pass it directly to [`d3.dagHierarchy`](#daghierarchy); otherwise, you can rearrange tabular data into a DAG using [`d3.dagStratify`](#dagStratify)

<a name="dagHierarchy" href="#dagHierarchy">#</a> d3.**dagHierarchy**()

Constructs a new hierarchy operator with the default settings.

<a name="_dagHierarchy" href="#_dagHierarchy">#</a> dagHierarchy(...*roots*)

Construct a dag from the specified root nodes.
Each root node must be an object representing a root node.
For example:

```json
{
  "name": "Eve",
    "children": [
    {
      "name": "Cain"
    },
    {
      "name": "Seth",
      "children": [
      {
        "name": "Enos"
      },
      {
        "name": "Noam"
      }
      ]
    },
    {
      "name": "Abel"
    },
    {
      "name": "Awan",
      "children": [
      {
        "name": "Enoch"
      }
      ]
    },
    {
      "name": "Azura"
    }
  ]
}
```

<a name="dh_id" href="#dh_id">#</a> dagHierarchy.**id**([*id*])

If *id* is specified, sets the id accessor to the given function and returns this dagHierarchy operator.
Otherwise, returns the current id accessor, which defaults to:

```js
function id(d) {
  return d.id;
}
```

<a name="children" href="#children">#</a> dagHierarchy.**children**([*children*])

If *children* is specified, sets the children accessor to the given function and returns this dagHierarchy operator.
Otherwise, returns the current children accessor, which defaults to:

```js
function children(d) {
  return d.children;
}
```

### DAG Stratify

<a name="dagStratify" href="#dagStratify">#</a> d3.**dagStratify**()

Constructs a new stratify operator with the default settings.

### DAG

The returned DAG has many useful methods.

<a name="nodes" href="#nodes">#</a> dag.**nodes**()

Returns a array of every node in the DAG.
Each node has the following properties:

* *node*.data - the associated data as specified in the constructor.
* *node*.parents - an array of all parent nodes. Empty if this is a root.
* *node*.children - an array of all child nodes. Empty if this is a leaf.

<a name="links" href="#links">#</a> dag.**links**()

Returns an array of every link in the DAG.
Each link has the following properties:

* *link*.source - a node that is a parent of target.
* *link*.target - a node that is a child of source.

### Topological Sort

This function allows getting a topological ordering of the nodes.

<a name="topologicalSort" href="#topologicalSort">#</a> d3.**topologicalSort**()

Assigns each node a `value` from `0` to `dag.nodes().length - 1` corresponding to a valid topological sort.

### DAG Layout

This constructs a layered representation of the DAG meant for visualization.

<a name="dagLayout" href="#dagLayout">#</a> d3.**dagLayout**()

Construct a new DAG layout operator with the default settings.

<a name="_dagLayout" href="#_dagLayout">#</a> dagLayout(*dag*)

Lays out the specified DAG, assigning the following properties:

* *node*.x - the x-coordinate of the node.
* *node*.y - the y-coordinate of the node.
* *link*.points - an array of points for how to draw the edge.
  Each point has an x and a y property.
