/**
 * A topological layout using {@link GridOperator}.
 *
 * @module
 */
import { Dag, DagNode } from "../dag";
import { map } from "../iters";
import { js, setEqual } from "../utils";
import { LaneOperator } from "./lane";
import { greedy, GreedyOperator } from "./lane/greedy";

type OpDag<Lop extends LaneOperator> = Lop extends LaneOperator<
  infer N,
  infer L
>
  ? Dag<N, L>
  : never;

/**
 * The return from calling {@link GridOperator}
 *
 * This is the final width and height of the laid out dag.
 */
export interface GridInfo {
  width: number;
  height: number;
}

/**
 * A simple grid based topological layout operator.
 *
 * This layout algorithm constructs a topological representation of the dag
 * meant for visualization. The nodes are topologically ordered and then nodes
 * are put into lanes such that an edge can travel horizontally to the lane of
 * a child node, and then down without intersecting to that child.
 *
 * This layout produces good representations when you want a compressed layout
 * where each node gets its only line formation.
 *
 * Create with {@link grid}.
 *
 * @example
 * <img alt="grid example" src="media://grid-greedy-topdown.png" width="200">
 *
 * @example
 * ```typescript
 * const data = [["parent", "child"], ...];
 * const create = connect();
 * const dag = create(data);
 * const layout = grid();
 * const { width, height } = layout(dag);
 * for (const node of dag) {
 *   console.log(node.x, node.y);
 * }
 * ```
 */
export interface GridOperator<Lane extends LaneOperator> {
  /** Layout the input dag */
  (dag: OpDag<Lane>): GridInfo;

  /**
   * Set the lane operator to the given {@link LaneOperator} and returns a new
   * version of this operator. (default: {@link GreedyOperator})
   */
  lane<NewLane extends LaneOperator>(val: NewLane): GridOperator<NewLane>;
  /** Get the current lane operator */
  lane(): Lane;

  /**
   * Sets this grid layout's node size to the specified two-element array of
   * numbers [ *width*, *height* ] and returns a new operator. These sizes are
   * effectively the grid size, e.g. the spacing between adjacent lanes or rows
   * in the grid. (default: [1, 1])
   *
   * Note, due to the way that edges are meant to rendered, edges won't
   * intersect with nodes if width is half of the actual node width.
   */
  nodeSize(val: readonly [number, number]): GridOperator<Lane>;
  /** Get the current node size. */
  nodeSize(): [number, number];

  /**
   * Update the grid layout size
   *
   * Sets this grid layout's node size to the specified two-element array of
   * numbers [ *width*, *height* ] and returns a new operator. After the
   * initial layout, if size is not null, the dag will be rescaled so that it
   * fits in width x height. (default: null)
   */
  size(val: null | readonly [number, number]): GridOperator<Lane>;
  /** Get the current size. */
  size(): null | [number, number];
}

/**
 * Verify that nodes were assigned valid lanes
 *
 * @internal
 */
function verifyLanes(ordered: DagNode[]): number {
  for (const node of ordered) {
    if (node.x === undefined) {
      throw new Error(js`coord didn't assign an x to node '${node}'`);
    } else if (node.x < 0) {
      throw new Error(`coord assigned an x (${node.x}) less than 0`);
    }
  }

  const uniqueExes = new Set(ordered.map((n) => n.x));
  if (!setEqual(uniqueExes, new Set(map(uniqueExes, (_, i) => i)))) {
    const exStr = [...uniqueExes].join(", ");
    throw new Error(
      `didn't assign increasing positive integers for x coordinates: ${exStr}`
    );
  }

  const parentIndex = new Map<DagNode, number>();
  for (const [ind, node] of ordered.entries()) {
    // test that no nodes overlap with edges
    const topIndex = parentIndex.get(node);
    if (topIndex !== undefined) {
      for (const above of ordered.slice(topIndex + 1, ind)) {
        if (above.x === node.x) {
          throw new Error(
            js`node ${above} was assigned an overlapping lane with ${node}`
          );
        }
      }
    }

    // update parent index
    for (const child of node.ichildren()) {
      if (!parentIndex.has(child)) {
        parentIndex.set(child, ind);
      }
    }
  }

  return uniqueExes.size;
}

/** @internal */
function buildOperator<N, L, Lane extends LaneOperator<N, L>>(options: {
  lane: Lane & LaneOperator<N, L>;
  nodeWidth: number;
  nodeHeight: number;
  size: null | readonly [number, number];
}): GridOperator<Lane> {
  function gridCall(dag: Dag<N, L>): GridInfo {
    const { nodeWidth, nodeHeight, size, lane } = options;

    // topological sort
    const ordered = [...dag.idescendants("before")];

    // assign ys
    for (const [i, node] of ordered.entries()) {
      node.y = i;
    }

    // get lanes
    lane(ordered);
    const numLanes = verifyLanes(ordered);

    // adjust x and y by nodeSize
    for (const node of ordered) {
      node.x = (node.x! + 0.5) * nodeWidth;
      node.y = (node.y! + 0.5) * nodeHeight;
    }

    // scale for size
    let width = numLanes * nodeWidth;
    let height = ordered.length * nodeHeight;
    if (size !== null) {
      const [newWidth, newHeight] = size;
      for (const node of ordered) {
        node.x! *= newWidth / width;
        node.y! *= newHeight / height;
      }
      width = newWidth;
      height = newHeight;
    }

    // assign link points
    for (const { source, target, points } of dag.ilinks()) {
      points.length = 0;
      if (source.x !== target.x) {
        points.push({ x: source.x!, y: source.y! });
      }
      points.push({ x: target.x!, y: source.y! });
      points.push({ x: target.x!, y: target.y! });
    }

    return { width, height };
  }

  function lane(): Lane;
  function lane<NL extends LaneOperator>(val: NL): GridOperator<NL>;
  function lane<NL extends LaneOperator>(val?: NL): GridOperator<NL> | Lane {
    if (val === undefined) {
      return options.lane;
    } else {
      const { lane: _, ...rest } = options;
      return buildOperator({ ...rest, lane: val });
    }
  }
  gridCall.lane = lane;

  function nodeSize(): [number, number];
  function nodeSize(sz: readonly [number, number]): GridOperator<Lane>;
  function nodeSize(
    val?: readonly [number, number]
  ): [number, number] | GridOperator<Lane> {
    if (val === undefined) {
      const { nodeWidth, nodeHeight } = options;
      return [nodeWidth, nodeHeight];
    } else {
      const [nodeWidth, nodeHeight] = val;
      return buildOperator({ ...options, nodeWidth, nodeHeight });
    }
  }
  gridCall.nodeSize = nodeSize;

  function size(): null | [number, number];
  function size(sz: null | readonly [number, number]): GridOperator<Lane>;
  function size(
    val?: null | readonly [number, number]
  ): null | [number, number] | GridOperator<Lane> {
    if (val !== undefined) {
      return buildOperator({ ...options, size: val });
    } else if (options.size === null) {
      return null;
    } else {
      const [width, height] = options.size;
      return [width, height];
    }
  }
  gridCall.size = size;

  return gridCall;
}

export type DefaultGridOperator = GridOperator<GreedyOperator>;

/**
 * Create a new {@link GridOperator} with default settings.
 */
export function grid(...args: never[]): DefaultGridOperator {
  if (args.length) {
    throw new Error(
      `got arguments to grid(${args}), but constructor takes no arguments.`
    );
  }
  return buildOperator({
    lane: greedy(),
    nodeWidth: 1,
    nodeHeight: 1,
    size: null
  });
}
