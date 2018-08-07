# d3-dag

Often data sets are hierarchical, but are not in a tree structure, such as genetic data.
In these instances `d3-hierarchy` may not suit your needs, which is why `d3-dag` (Directed Acyclic Graph) exists.
This module implements a data structures for manipulating DAGs that mimics the API of `d3-hierarchy` as much as possible.


## Installing

If you use NPM, `npm i d3-dag`.
Otherwise you can load it using `unpkg`:

```html
<script src="https://unpkg.com/d3-dag"></script>
<script>

var dag = d3.sugiyama();

</script>
```

[Try d3-dag in your browser.](https://tonicdev.com/npm/d3-dag)

## API Reference

* [Hierarchy](#hierarchy)
* [Stratify](#stratify)
* [DAG](#dag) ([Node](#node))
* [Topological Sort](#topological-sort)
* [Sugiyama](#sugiyama)


### Hierarchy

Before you can compute a DAG layout, you need a DAG structure.
If your data is already in a DAG structure, you can pass it directly to [`d3.dierarchy`](#dierarchy); otherwise, you can rearrange tabular data into a DAG using [`d3.dratify`](#dratify)

<a name="dierarchy" href="#dierarchy">#</a> d3.**dierarchy**()

Constructs a new hierarchy operator with the default settings.

<a name="_dierarchy" href="#_dierarchy">#</a> dierarchy(...*roots*)

Construct a dag from the specified root nodes.
Each root node must be an object representing a root node.
For example:

```json
{
  "id": "Eve",
    "children": [
    {
      "id": "Cain"
    },
    {
      "id": "Seth",
      "children": [
      {
        "id": "Enos"
      },
      {
        "id": "Noam"
      }
      ]
    },
    {
      "id": "Abel"
    },
    {
      "id": "Awan",
      "children": [
      {
        "id": "Enoch"
      }
      ]
    },
    {
      "id": "Azura"
    }
  ]
}
```

<a name="dh_id" href="#dh_id">#</a> dierarchy.**id**([*id*])

If *id* is specified, sets the id accessor to the given function and returns this dierarchy operator.
Otherwise, returns the current id accessor, which defaults to:

```js
function id(d) {
  return d.id;
}
```

<a name="children" href="#children">#</a> dierarchy.**children**([*children*])

If *children* is specified, sets the children accessor to the given function and returns this dierarchy operator.
Otherwise, returns the current children accessor, which defaults to:

```js
function children(d) {
  return d.children;
}
```


### Stratify

You can rearrange more tabular data into a DAG using [`d3.dratify`](#dratify).

<a name="dratify" href="#dratify">#</a> d3.**dratify**()

Constructs a new stratify operator with the default settings.

<a name="_dratify" href="#_dratify">#</a> dratify(data)

Construct a dag from the specified *data*.
The data should be an array of data elements that contain info about their parents.
For example:

```json
[
  {
    "id": "Eve"
  },
  {
    "id": "Cain",
    "parentIds": ["Eve"]
  },
  {
    "id": "Seth",
    "parentIds": ["Eve"]
  },
  {
    "id": "Enos",
    "parentIds": ["Seth"]
  },
  {
    "id": "Noam",
    "parentIds": ["Seth"]
  },
  {
    "id": "Abel",
    "parentIds": ["Eve"]
  },
  {
    "id": "Awan",
    "parentIds": ["Eve"]
  },
  {
    "id": "Enoch",
    "parentIds": ["Eve"]
  },
  {
    "id": "Azura",
    "parentIds": ["Eve"]
  }
]
```

<a name="ds_id" href="#ds_id">#</a> dratify.**id**([*id*])

If *id* is specified, sets the id accessor to the given function and returns this dratify operator.
Otherwise, returns the current id accessor, which defaults to:

```js
function id(d) {
  return d.id;
}
```

<a name="parentIds" href="#parentIds">#</a> dratify.**parentIds**([*parentIds*])

If *parentIds* is specified, sets the parentIds accessor to the given function and returns this dratify operator.
Otherwise, returns the current parentIds accessor, which defaults to:

```js
function parentIds(d) {
  return d.parentIds;
}
```


### DAG

The returned DAG has many useful methods.

<a name="d_nodes" href="#d_nodes">#</a> dag.**nodes**()

Returns a array of every [node](#node) in the DAG.

<a name="d_links" href="#d_links">#</a> dag.**links**()

Returns an array of every link in the DAG.
Each link has the following properties:

* *link*.source - a node that is a parent of target.
* *link*.target - a node that is a child of source.
* *link*.data - an object with data attached to the link.
  Modifying this object will preserve the data for that link.

<a name="d_copy" href="#d_copy">#</a> dag.**copy**()

Copies the dag structure and returns it.
The data associated with every node is not copied.

<a name="d_reverse" href="#d_reverse">#</a> dag.**reverse**()

Reverse the dag in place.
This is particularly useful if you want to use the opposite accessor in DAG creation.
For example, if your data set has childIds, you can use *dratify* with parentIds and simply reverse the DAG post creation.

<a name="d_count" href="#d_count">#</a> dag.**count**()

Set the *value* of each node to be the number of descendants including itself.

<a name="d_depth" href="#d_depth">#</a> dag.**depth**()

Set the *value* of each node to be zero if its a root node, or the greatest distance to any root node for other nodes.

<a name="d_height" href="#d_height">#</a> dag.**height**()

Set the *value* of each node to be zero if its a leaf node, or the greatest distance to any leaf node for other nodes.

<a name="d_each" href="#d_each">#</a> dag.**each**(*function*)

Invoke the specified *function* on each node in an arbitrary order.

<a name="d_eacha" href="#d_eacha">#</a> dag.**eachAfter**(*function*)

Invoke the specified *function* on each node such a node is called before any of its parents.

<a name="d_eachb" href="#d_eachb">#</a> dag.**eachBefore**(*function*)

Invoke the specified *function* on each node such a node is called before any of its children.

<a name="d_eachbr" href="#d_eachbr">#</a> dag.**eachBreadth**(*function*)

Invoke the specified *function* on each node in breadth first order.

<a name="d_equals" href="#d_equals">#</a> dag.**equals**(*that*)

Return `true` if *this* dag is equal to *that* dag.
For two dags to be equal the data must be strictly (`===`) equal.

<a name="d_every" href="#d_every">#</a> dag.**every**(*function*)

Return `true` if *function* returns true for every node in the DAG.

<a name="d_some" href="#d_some">#</a> dag.**some**(*function*)

Return `true` if *function* returns true for at least one node in the DAG.

<a name="d_sum" href="#d_sum">#</a> dag.**sum**(*function*)

Set the *value* of every node to be the sum of this *functions* return value on the current node's data and the value of every descendant's return value.


### Node

DAGs are collection of nodes.
Many DAG methods either return or operate on these individual node objects.
Each node has the following properties:

* *node*.id - a unique string identification for each node.
  This is necessary in order to check if two nodes are identical.
  For internal purposes, ids may not contain the null character (`'\0'`).
* *node*.data - the associated data as specified in the constructor.
* *node*.parents - an array of all parent nodes. Empty if this is a root.
* *node*.children - an array of all child nodes. Empty if this is a leaf.

Each node also has the following methods.
Functions that are identical to DAG functions operate as if this node were the single root of the DAG.

<a name="n_ancestors" href="#n_ancestors">#</a> node.**ancestors**()

Return an array of all ancestor nodes of this node.

<a name="n_descendants" href="#n_descendants">#</a> node.**descendants**()

Return an array of all descendant nodes of this node.

<a name="n_childLinks" href="#n_childLinks">#</a> node.**childLinks**()

Return an array of all *links* to this node's children.

<a name="n_links" href="#n_links">#</a> node.**links**()

See <a href="d_links">DAG</a>.

<a name="n_count" href="#n_count">#</a> node.**count**()

See <a href="d_count">DAG</a>.

<a name="n_depth" href="#n_depth">#</a> node.**depth**()

See <a href="d_depth">DAG</a>.

<a name="n_height" href="#n_height">#</a> node.**height**()

See <a href="d_height">DAG</a>.

<a name="n_each" href="#n_each">#</a> node.**each**(*function*)

See <a href="d_each">DAG</a>.

<a name="n_eacha" href="#n_eacha">#</a> node.**eachAfter**(*function*)

See <a href="d_eacha">DAG</a>.

<a name="n_eachb" href="#n_eachb">#</a> node.**eachBefore**(*function*)

See <a href="d_eachb">DAG</a>.

<a name="n_eachbr" href="#n_eachbr">#</a> node.**eachBreadth**(*function*)

See <a href="d_eachbr">DAG</a>.

<a name="n_equals" href="#n_equals">#</a> node.**equals**(*that*)

See <a href="d_equals">DAG</a>.

<a name="n_every" href="#n_every">#</a> node.**every**(*function*)

See <a href="d_every">DAG</a>.

<a name="n_some" href="#n_some">#</a> node.**some**(*function*)

See <a href="d_some">DAG</a>.

<a name="n_sum" href="#n_sum">#</a> node.**sum**(*function*)

See <a href="d_sum">DAG</a>.


### Topological Sort

This function allows getting a topological ordering of the nodes.

<a name="topologicalSort" href="#topologicalSort">#</a> d3.**topologicalSort**()

Assigns each node a `value` from `0` to `dag.nodes().length - 1` corresponding to a valid topological sort.


### Sugiyama

This constructs a layered representation of the DAG meant for visualization.
The algorithm is based off ideas presented in K. Sugiyama et al. [1979], but described by [S. Hong](http://www.it.usyd.edu.au/~shhong/fab.pdf).

<a name="c_sugiyama" href="#c_sugiyama">#</a> d3.**sugiyama**()

Construct a new Sugiyama layout operator with the default settings.

<a name="f_sugiyama" href="#f_sugiyama">#</a> sugiyama(*dag*)

Lays out the specified DAG, assigning the following properties:

* *node*.x - the x-coordinate of the node.
* *node*.y - the y-coordinate of the node.
* *link*.points - an array of points for how to draw the edge.
  Each point has an x and a y property.
  This might be undefined if nodes are adjacent in the hierarchy.

<a name="sugi_size" href="#sugi_size">#</a> sugiyama.**size**([*size*])

If *size* is specified, sets this sugiyama layout's size to the specified two-element array of numbers [*width*, *height*] and returns this sugiyama layout.
If *size* is not specified, returns the current layout size, which defaults to [1, 1].

<a name="layering" href="#layering">#</a> sugiyama.**layering**([*layering*])

If *layering* is specified, sets the layering accessor to the specified function and returns this sugiyama layout.
If *layering* is not specified, returns the current layering accessor, which defaults to *d3.layeringSimplex*.
A layering accessor takes a dag and assigns every node a layer attribute from zero to the number of layers - 1.

<a name="decross" href="#decross">#</a> sugiyama.**decross**([*decross*])

If *decross* is specified, sets the decross accessor to the specified function and returns this sugiyama layout.
If *decross* is not specified, returns the current decross accessor, which defaults to *d3.decrossOpt*.
A decross accessor takes a dag as an array of layers where each layer is an array of nodes, and modifies the order of nodes in each layer to reduce the number of link crossings.

<a name="coord" href="#coord">#</a> sugiyama.**coord**([*coord*])

If *coord* is specified, sets the coord accessor to the specified function and returns this sugiyama layout.
If *coord* is not specified, returns the current coord accessor, which defaults to *d3.coordMinDist*.
A coord accessor takes a dag as an array of layers where each layer is an array of nodes, and assigns every node an x property in [0, 1] to specify the actual layout.

### Sugiyama Layering Accessors

Several built-in layering accessors are provided for use with [*sugiyama*](#sugiyama).

<a name="layeringLongestPath" href="#layeringLongestPath">#</a> d3.**layeringLongestPath**(*dag*)

Assigns every node a layer such that the longest path (the height) is minimized.
This often results in very wide graphs, but is fast.

<a name="layeringCoffmanGraham" href="#layeringCoffmanGraham">#</a> d3.**layeringCoffmanGraham**(*dag*)

Assigns every node a layer such that the width, not counting dummy nodes, is less than the square root of the total number of nodes.
This can result in tall graphs, but is also reasonably fast.

<a name="layeringSimplex" href="#layeringSimplex">#</a> d3.**layeringSimplex**(*dag*)

Assigns every node a layer such that the number of dummy nodes, nodes inserted on edges that span more than one layer, is minimized.
This is often known as the network simplex layering from [Gansner et al. [1993]](https://www.graphviz.org/Documentation/TSE93.pdf).


### Sugiyama Decross Accessors

Several built-in decross accessors are provided for use with [*sugiyama*](#sugiyama).

<a name="decrossOpt" href="#decrossOpt">#</a> d3.**decrossOpt**(*layers*)

Orders an array of layers, where each layer is composed of nodes with the same layer, such that the number of crossings is minimized.
This method uses an MILP, and therefore may be quite slow.


### Sugiyama Coord Accessors

Several built-in coord accessors are provided for use with [*sugiyama*](#sugiyama).

<a name="coordSpread" href="#coordSpread">#</a> d3.**coordSpread**(*layers*)

Positions nodes in each layer so that they are the most spread out.
This coordinate assignment is not particularly pleasing, but it is fast.

<a name="coordMinDist" href="#coordMinDist">#</a> d3.**coordMinDist**(*layers*)

Positions nodes in each layer so that the total distance of edges is minimized.

<a name="coordMinCurve" href="#coordMinCurve">#</a> d3.**coordMinCurve**(*layers*)

Positions nodes in each layer so that the curves between nodes is minimized, and ties are broken by minimum distance.


## To Do

- Add source code links.
- Should coords take a separation function?
- Are names good? Polluting namespace? More complex names?
- Make functions mimic hierarchy more, like adding a distance between nodes at the same height?
- Implement less accurate methods that will run in faster time.
  See [this](http://www.it.usyd.edu.au/~shhong/fab.pdf) for potential options.
- Decide if special dag structure is better, or enshrined dummy nodes are better.
  Enshrined dummy nodes might allow a structure that doesn't include parent references, and instead only uses children, which will allow for more interesting dag overlaps / manipulation of the structure on the fly.
- Add min dummy angle for coord assign?
  Problem is underspecified if only minimizing dummy angle, so also need to minimize some other relevant proxy on undefined nodes, e.g. distance.
- Topological sort layout, that allows minimizing the number of crossings, and gives edges points (along diagonal?).
  Could similarly just do a topological layering for sugiyama.
- DAG Size?
- Coffman-Graham with width specificity, or potential one that trys to binary search area?
  Specifying width would probably require changing the API to make d3.layeringX be a function call that can be fluently chained to add parameters in d3 fashion.
