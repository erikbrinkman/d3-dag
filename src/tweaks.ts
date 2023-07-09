import { Graph } from "./graph";
import { LayoutResult, NodeSize, cachedNodeSize } from "./layout";
import { err } from "./utils";

/**
 * a function to tweak a graph layout
 *
 * {@link Tweak}s allow abstracting over general modifications to graph
 * layouts. There are several built in:
 * - {@link tweakSize} - This tweak scales the graph so that its final size is
 *   a specified constant size.
 * - {@link tweakFlip} - This tweak allows flipping the graph in various ways,
 *   so you could make a layout bottom up, or horizontal.
 * - {@link tweakGrid} - Tweaks {@link grid} layout link points to make
 *   pleasing links easier to render.
 * - {@link tweakShape} - Given the current {@link NodeSize}, sets the final
 *   control points of each link so that they end on the edge of the given
 *   shape. For simple layouts, this should prevent needing to render links
 *   behind nodes. In complex cases, it allows consistently rendering arrows or
 *   other link terminal icons at the edge of a shape.
 *
 * You can also implement your own tweak. There's not a reason to give an
 * example, as tweaks are pretty unbounded. As input you get a laidout graph,
 * and the dimensions of that layout. Modify the graph arbitrarily, and return
 * the new dimensions after tweaking the layout.
 */
export interface Tweak<in N = never, in L = never> {
  /**
   * tweak the graph with the current dimensions
   *
   * @param graph - the graph to  tweak
   * @param res - the current dimensions of the graph
   * @returns the new dimensions
   */
  (graph: Graph<N, L>, res: Readonly<LayoutResult>): LayoutResult;
}

/**
 * tweak the laidout dag by resizing it
 *
 * The x and y coordinates of everything are rescaled to fit within the specified size.
 */
export function tweakSize(
  size: Readonly<LayoutResult>,
): Tweak<unknown, unknown> {
  const { width: nw, height: nh } = size;
  function tweakSize(
    graph: Graph<unknown, unknown>,
    res: Readonly<LayoutResult>,
  ): LayoutResult {
    const { width: ow, height: oh } = res;
    const xscale = nw / ow;
    const yscale = nh / oh;

    for (const node of graph.nodes()) {
      node.x *= xscale;
      node.y *= yscale;
    }

    for (const link of graph.links()) {
      for (const point of link.points) {
        point[0] *= xscale;
        point[1] *= yscale;
      }
    }
    return size;
  }
  return tweakSize;
}

/**
 * This tweak adds extra control points to the grid layout
 *
 * The grid layout often looks best with rounded corners. This tweak adds extra
 * control points to edges so that `d3.curveBasis` curves produce nice rounded
 * edges.
 *
 * rounding should be set somewhere between 0 and nodeSize.
 */
export function tweakGrid(
  rounding: readonly [number, number],
): Tweak<unknown, unknown> {
  const [xt, yt] = rounding;
  function tweakGrid(
    graph: Graph<unknown, unknown>,
    res: Readonly<LayoutResult>,
  ): LayoutResult {
    for (const link of graph.links()) {
      const [first, mid, last, rem] = link.points;
      if (rem !== undefined) {
        throw err`link points had more than three points: ${link.points.length}; tweakGridPoints can only be applied to grid layouts`;
      } else if (last !== undefined) {
        const [fx, fy] = first;
        const [mx, my] = mid;
        const [lx, ly] = last;
        link.points = [
          first,
          [mx + xt * Math.sign(fx - mx), my + yt * Math.sign(fy - my)],
          mid,
          [mx + xt * Math.sign(lx - mx), my + yt * Math.sign(ly - my)],
          last,
        ];
      }
    }
    return res;
  }
  return tweakGrid;
}

function tweakFlipDiag(
  graph: Graph<unknown, unknown>,
  res: Readonly<LayoutResult>,
): LayoutResult {
  for (const node of graph.nodes()) {
    const temp = node.x;
    node.x = node.y;
    node.y = temp;
  }

  for (const link of graph.links()) {
    for (const point of link.points) {
      const [temp] = point;
      point[0] = point[1];
      point[1] = temp;
    }
  }
  const { width, height } = res;
  return { width: height, height: width };
}

function tweakFlipVert(
  graph: Graph<unknown, unknown>,
  res: Readonly<LayoutResult>,
): LayoutResult {
  const { height } = res;
  for (const node of graph.nodes()) {
    node.y = height - node.y;
  }

  for (const link of graph.links()) {
    for (const point of link.points) {
      point[1] = height - point[1];
    }
  }
  return res;
}

function tweakFlipHoriz(
  graph: Graph<unknown, unknown>,
  res: Readonly<LayoutResult>,
): LayoutResult {
  const { width } = res;
  for (const node of graph.nodes()) {
    node.x = width - node.x;
  }

  for (const link of graph.links()) {
    for (const point of link.points) {
      point[0] = width - point[0];
    }
  }
  return res;
}

/**
 * Tweak to flip the layout in several ways
 *
 * - `diagonal` : flips x and y coordinates turning x into y
 * - `horizontal` : inverts x
 * - `vertical` : inverts y
 */
export function tweakFlip(
  style: "diagonal" | "horizontal" | "vertical" = "diagonal",
): Tweak<unknown, unknown> {
  if (style === "diagonal") {
    return tweakFlipDiag;
  } else if (style === "vertical") {
    return tweakFlipVert;
  } else if (style === "horizontal") {
    return tweakFlipHoriz;
  } else {
    throw err`invalid tweakFlip style: ${style}`;
  }
}

/**
 * a shape callable used to truncate an edge path at a node
 *
 * This represents how to tweak the edge of a link conditioned on the shape of
 * the node. This is useful for adding endings to an link (like arrows) that
 * will align with a node well.
 */
export interface Shape {
  /**
   * compute the new start link edge point from the current settings
   *
   * This should return a new "start" point that touches the edge of the
   * desired shape. In all cases, `start` should equal `center` and `end`
   * should be ouside of the bounding box, but it won't hurt for
   * implementations to be robust in case this isn't true.
   *
   * @param center - the center of the node
   * @param nodeSize - the bounding box size of the node
   * @param start - the start of the path edge
   * @param end - the end of the path edge
   * @returns the new start point for the edge of the shape
   */
  (
    center: readonly [number, number],
    nodeSize: readonly [number, number],
    start: readonly [number, number],
    end: readonly [number, number],
  ): [number, number];
}

const enum Direction {
  Left = 1,
  Right = 2,
  Bottom = 4,
  Top = 8,
}

/**
 * a bounding box shape for the full rectangle
 *
 * Useful with [`tweakShape`].
 */
export function shapeRect(
  center: readonly [number, number],
  nodeSize: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number],
): [number, number] {
  const [cx, cy] = center;
  const [width, height] = nodeSize;

  // variant of Cohen–Sutherland to suit this purposes, we only move the end
  // point, and slightly modify the returns
  const [sx, sy] = start;
  let [ex, ey] = end;
  const xmin = cx - width / 2;
  const xmax = cx + width / 2;
  const ymin = cy - height / 2;
  const ymax = cy + height / 2;

  function outCode(x: number, y: number): number {
    let code = 0;
    if (x < xmin) {
      code |= Direction.Left;
    } else if (x > xmax) {
      code |= Direction.Right;
    }
    if (y < ymin) {
      code |= Direction.Bottom;
    } else if (y > ymax) {
      code |= Direction.Top;
    }
    return code;
  }

  const scode = outCode(sx, sy);
  let ecode = outCode(ex, ey);
  if (!ecode) {
    // in this instance there's not a good return and our assumptions were violated, so we just error
    throw err`line from [${sx}, ${sy}] -> [${ex}, ${ey}] ended inside rectangle centered at [${cx}, ${cy}] with size [${width}, ${height}]`;
  }

  for (;;) {
    if (!ecode) {
      // moved endpoint into the rectangle this is the new point
      return [ex, ey];
    } else if (scode & ecode) {
      // entirely outside return start
      return [sx, sy];
    } else if (ecode & Direction.Top) {
      ex = sx + ((ex - sx) * (ymax - sy)) / (ey - sy);
      ey = ymax;
    } else if (ecode & Direction.Bottom) {
      ex = sx + ((ex - sx) * (ymin - sy)) / (ey - sy);
      ey = ymin;
    } else if (ecode & Direction.Right) {
      ey = sy + ((ey - sy) * (xmax - sx)) / (ex - sx);
      ex = xmax;
    } else {
      // ecode & Direction.Left
      ey = sy + ((ey - sy) * (xmin - sx)) / (ex - sx);
      ex = xmin;
    }
    ecode = outCode(ex, ey);
  }
}

/**
 * a bounding box shape for an ellipse
 *
 * Useful with [`tweakShape`].
 */
export function shapeEllipse(
  center: readonly [number, number],
  nodeSize: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number],
): [number, number] {
  const [cx, cy] = center;
  const [width, height] = nodeSize;
  const [sx, sy] = start;
  const [ex, ey] = end;

  const a = width / 2;
  const b = height / 2;
  const m = ex - sx;
  const c = sx - cx;
  const n = ey - sy;
  const d = sy - cy;

  const a2 = a * a;
  const b2 = b * b;
  const den = a2 * n * n + b2 * m * m;
  const diff = m * d - n * c;
  const root = den - diff * diff;

  if (root >= 0) {
    // intersection
    const rooted = a * b * Math.sqrt(root);
    const num = m * c * b2 + n * d * a2;
    const t1 = (num + rooted) / -den;
    const t2 = (num - rooted) / -den;

    // check that end point is not inside ellipse
    if (t1 < 1 && 1 < t2) {
      throw err`line from [${sx}, ${sy}] -> [${ex}, ${ey}] ended inside ellipse at [${cx}, ${cy}] with size [${width}, ${height}]`;
    } else if (0 <= t2 && t2 <= 1) {
      // select closer point to end
      return [t2 * m + sx, t2 * n + sy];
    } else {
      // no intersection
      return [sx, sy];
    }
  } else {
    // no intersection
    return [sx, sy];
  }
}

/**
 * tweak the layout by truncating edges early
 *
 * This tweak truncates edges at the extent of a node shape sized by a bounding
 * box. After applying this tweak, edge endings like arrows can be easily
 * rendered in the appropriate place.
 *
 * There are two built in {@link Shape}s:
 * - {@link shapeRect} - a simple rectangle
 * - {@link shapeEllipse} - an ellipse (circle for square node sizes)
 */
export function tweakShape<N, L>(
  nodeSize: NodeSize<N, L>,
  shape: Shape = shapeRect,
): Tweak<N, L> {
  function tweakShape(
    graph: Graph<N, L>,
    res: Readonly<LayoutResult>,
  ): LayoutResult {
    for (const node of graph.nodes()) {
      const center = [node.x, node.y] as const;
      const size = typeof nodeSize === "function" ? nodeSize(node) : nodeSize;
      for (const { points } of node.parentLinks()) {
        const [second, first] = points.slice(-2);
        const trimmed = shape(center, size, first, second);
        points.splice(-1, 1, trimmed);
      }
      for (const { points } of node.childLinks()) {
        const [first, second] = points;
        const trimmed = shape(center, size, first, second);
        points.splice(0, 1, trimmed);
      }
    }
    return res;
  }
  return tweakShape;
}

/**
 * clip the x coordinate along a line to within x range
 */
function clipPoint(
  [sx, sy]: readonly [number, number],
  [ex, ey]: readonly [number, number],
  y: number,
  [sr, er]: readonly [number, number],
): number {
  const dy = ey - sy;
  const mx = (dy === 0 ? 0 : ((y - sy) / dy) * (ex - sx)) + sx;
  return Math.min(Math.max(sr, mx), er);
}

function findClip(
  p1: readonly [number, number],
  p2: readonly [number, number],
  ys: readonly number[],
  xrange: readonly [number, number],
): undefined | [number, number] {
  // ensure p2 has higher y
  if (p1[1] > p2[1]) {
    [p1, p2] = [p2, p1];
  }

  for (const y of ys) {
    if (p1[1] <= y && y <= p2[1]) {
      return [clipPoint(p1, p2, y, xrange), y];
    }
  }
}

/**
 * tweak the sugiyama layout by add a control point inside the bounding box
 *
 * This tweak adds a control point to the edge (top / bottom) of the bounding
 * box. This prevents edges from crossing over nodes when nodes are very far
 * apart horizontally.
 *
 * @remarks
 *
 * If using in conjunction with {@link tweakShape}, this should occur first,
 * although it shouldn't be strictly necessary.
 */
export function tweakSugiyama<N, L>(nodeSize: NodeSize<N, L>): Tweak<N, L> {
  const cachedSize = cachedNodeSize(nodeSize);

  function tweakSugiyama(
    graph: Graph<N, L>,
    res: Readonly<LayoutResult>,
  ): LayoutResult {
    // NOTE we compute this per link instead of per node so that the first
    // modification doesn't affect the second for two-point nodes
    for (const { source, target, points } of graph.links()) {
      const additions: [number, [number, number]][] = [];
      for (const [ind, node] of [
        [1, source],
        [-1, target],
      ] as const) {
        const [width, height] = cachedSize(node);
        const xrange = [node.x - width / 2, node.x + width / 2] as const;
        const ys = [node.y - height / 2, node.y + height / 2];
        const [p1, p2] = points.slice(-2);
        const added = findClip(p1, p2, ys, xrange);
        if (added) {
          additions.push([ind, added]);
        }
      }
      for (const [ind, add] of additions) {
        points.splice(ind, 0, add);
      }
    }
    return res;
  }

  return tweakSugiyama;
}
