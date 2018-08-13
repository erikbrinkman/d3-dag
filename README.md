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

A DAG is simply a collection of nodes, defined by every reachable child node from the current returned node.
If a DAG contains multiple roots, then the returned node will be special in that it will have an `undefined` `id` and `data` and will be ignored when calling normal mewthods.
Each child of this special returned node will be one of the roots of the graph.
Each child node on its own will function as a valid DAG with a single root.
Each node has the following properties:

* *node*.id - a unique string identification for each node.
  This is necessary in order to check if two nodes are identical.
  For internal purposes, ids may not contain the null character (`'\0'`).
* *node*.data - the associated data as specified in the constructor.
* *node*.children - an array of all child nodes. Empty if this is a leaf.

Each node also has the following methods.

<a name="descendants" href="#descendants">#</a> node.**descendants**()

Return an array of all descendant nodes of this node.

<a name="links" href="#links">#</a> node.**links**()

Returns an array of every link in the DAG.
Each link has the following properties:

* *link*.source - a node that is a parent of target.
* *link*.target - a node that is a child of source.
* *link*.data - an object with data attached to the link.
  Modifying this object will preserve the data for that link.

<a name="copy" href="#copy">#</a> node.**copy**()

Copies the dag structure and returns it.
The data associated with every node is not copied.

<a name="reverse" href="#reverse">#</a> node.**reverse**()

Copy and reverse the DAG, returning a new root or pseudo root depending on if there are multiple roots.
This is particularly useful if you want to use the opposite accessor in DAG creation.
For example, if your data set has childIds, you can use *dratify* with parentIds and simply reverse the DAG post creation.

<a name="count" href="#count">#</a> node.**count**()

Set the *value* of each node to be the number of descendants including itself.

<a name="depth" href="#depth">#</a> node.**depth**()

Set the *value* of each node to be zero if its a root node, or the greatest distance to any root node for other nodes.

<a name="height" href="#height">#</a> node.**height**()

Set the *value* of each node to be zero if its a leaf node, or the greatest distance to any leaf node for other nodes.

<a name="each" href="#each">#</a> node.**each**(*function*)

Invoke the specified *function* on each node in an arbitrary order.

<a name="eacha" href="#eacha">#</a> node.**eachAfter**(*function*)

Invoke the specified *function* on each node such a node is called before any of its parents.

<a name="eachb" href="#eachb">#</a> node.**eachBefore**(*function*)

Invoke the specified *function* on each node such a node is called before any of its children.

<a name="eachbr" href="#eachbr">#</a> node.**eachBreadth**(*function*)

Invoke the specified *function* on each node in breadth first order.

<a name="equals" href="#equals">#</a> node.**equals**(*that*)

Return `true` if *this* dag is equal to *that* dag.
For two dags to be equal the data must be strictly (`===`) equal.

<a name="every" href="#every">#</a> node.**every**(*function*)

Return `true` if *function* returns true for every node in the DAG.

<a name="some" href="#some">#</a> node.**some**(*function*)

Return `true` if *function* returns true for at least one node in the DAG.

<a name="sum" href="#sum">#</a> node.**sum**(*function*)

Set the *value* of every node to be the sum of this *functions* return value on the current node's data and the value of every descendant's return value.


### Topological Sort

This function allows getting a topological ordering of the nodes.

<a name="topologicalSort" href="#topologicalSort">#</a> d3.**topologicalSort**()

Assigns each node a `value` from `0` to `node.descendants().length - 1` corresponding to a valid topological sort.


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

![longest path example](examples/longestPath.png)

<a name="layeringCoffmanGraham" href="#layeringCoffmanGraham">#</a> d3.**layeringCoffmanGraham**(*dag*)

Assigns every node a layer such that the width, not counting dummy nodes, is less than the square root of the total number of nodes.
This can result in tall graphs, but is also reasonably fast.

![Coffman-Graham example](examples/coffmanGraham.png)

<a name="layeringSimplex" href="#layeringSimplex">#</a> d3.**layeringSimplex**(*dag*)

Assigns every node a layer such that the number of dummy nodes, nodes inserted on edges that span more than one layer, is minimized.
This is often known as the network simplex layering from [Gansner et al. [1993]](https://www.graphviz.org/Documentation/TSE93.pdf).

![simplex example](examples/simplex.png)


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

![spread example](examples/spread.png)

<a name="coordMinDist" href="#coordMinDist">#</a> d3.**coordMinDist**(*layers*)

Positions nodes in each layer so that the total distance of edges is minimized.

![min dist example](examples/simplex.png)

<a name="coordMinCurve" href="#coordMinCurve">#</a> d3.**coordMinCurve**(*layers*)

Positions nodes in each layer so that the curves between nodes is minimized, and ties are broken by minimum distance.


## To Do

There are many things that could be done.
These sections are organized by type.


### Sugiyama Additions

- Modify Coffman-Graham to have width specificity, or potentially one that tries to binary search by area?
  Specifying width would probably require changing the API to make d3.layeringX be a function call that can be fluently chained to add parameters in d3 fashion.
- Add topological sort layering.
  This would have poor height, but minimum width not including dummy nodes.
  Layout might work if crossings are minimized.
- Add layer sweep algorithm for crossing minimization.
  This algorithm has many possible implementations or parameters.
  First, there could be a flag to do greedy swaps to reduce crossing count at each layer.
  Second, there are several possible methods for how to do the layer optimization:
  - None
  - Mean (Barycenter)
  - Median
  - Optimal, version of layer opt, but only for bottom in two layer
- Add greedy coordinate assignment method, and remove spread assignment.
  First, position nodes at mean of neighbors, then shift nodes to have spacing according to priority.
  Greedy probably won't really work.
  Should be able to assign to mediam mean or other initial coordinate, then solve lp to respect layer assignment so that highest priority moves the least.
- Fix min curve to make sure that matrix is positive definite.
  This requires the same fix that dummy angle does, which is tie breaking when problem is underspecified.
  This might be better fixed by just optimizing both curves and distance, but downweighting distance by some amount enough to make the change somewhat insignificant.
- Add min dummy angle for coord assign.
  Problem is underspecified if only minimizing dummy angle, so also need to minimize some other relevant proxy on undefined nodes, e.g. distance.


### General Additions

- Add source code links.
- Coords should take separation function, that should be a parameter to sugiyama to match d3.hierarchy.


### Design Additions

- Should names / prefixes be changed?
  Some seem like they'd be hard to discover or are too abbreviated.
- Decide if special dag structure is better, or enshrined dummy nodes, or manditory single root node is better.
  Enshrined dummy nodes would be like a root node, but that algorithms knew to ignore.
  They might allow a structure that doesn't include parent references, and instead only uses children, which will allow for more interesting dag overlaps / manipulation of the structure on the fly.
- More generally, should DAGs simply be local objects, i.e. fit the node interface and only have a children.
  A dag would then be defined as the whole structure achieved by continually calling children without having a duplicate id.
  The duplicate id could be checked by then verifying that the node objects compare with strict equality and throwing an exception otherwise.
- Should DAG also have a size method?
