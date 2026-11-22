import type { Graph } from "./graph/index.js";
import {
  cachedNodeSize,
  type LayoutResult,
  type NodeSize,
  type Rankdir,
} from "./layout.js";
import { err } from "./utils.js";

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
 * - {@link tweakSugiyama} - Adds control points inside the bounding box of
 *   source/target nodes, preventing edges from crossing over nodes.
 * - {@link tweakGridHandles} - Moves grid edge bend points to the midpoint of
 *   the gap between rows, producing smoother edges for handle-based frameworks.
 * - {@link tweakDirection} - Converts the default top-to-bottom layout to a
 *   specified direction (BT, LR, RL).
 *
 * You can also implement your own tweak. There's not a reason to give an
 * example, as tweaks are pretty unbounded. As input you get a laidout graph,
 * and the dimensions of that layout. Modify the graph arbitrarily, and return
 * the new dimensions after tweaking the layout.
 */
export type Tweak<in N = never, in L = never> = (
  graph: Graph<N, L>,
  res: Readonly<LayoutResult>,
) => LayoutResult;

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
    // a layout with no extent along an axis is centered along it
    const xscale = ow ? nw / ow : 0;
    const xshift = ow ? 0 : nw / 2;
    const yscale = oh ? nh / oh : 0;
    const yshift = oh ? 0 : nh / 2;

    for (const node of graph.nodes()) {
      node.x = node.x * xscale + xshift;
      node.y = node.y * yscale + yshift;
    }

    for (const link of graph.links()) {
      for (const point of link.points) {
        point[0] = point[0] * xscale + xshift;
        point[1] = point[1] * yscale + yshift;
      }
    }
    return size;
  }
  return tweakSize;
}

/** a point on the way from a corner toward its neighbor */
function nearCorner(
  [mx, my]: [number, number],
  [nx, ny]: [number, number],
  [xt, yt]: readonly [number, number],
): [number, number] {
  // move xt sideways or yt up and down, whichever comes first, but no
  // farther than halfway, where the neighbor's rounding would meet it
  const dx = Math.abs(nx - mx);
  const dy = Math.abs(ny - my);
  const frac = Math.min(
    dx > 2 * xt ? xt / dx : 0.5,
    dy > 2 * yt ? yt / dy : 0.5,
  );
  return [mx + frac * (nx - mx), my + frac * (ny - my)];
}

/**
 * This tweak adds extra control points to the grid layout
 *
 * The grid layout often looks best with rounded corners. This tweak adds extra
 * control points to edges so that `d3.curveBasis` curves produce nice rounded
 * edges, including on self loops.
 *
 * rounding should be set somewhere between 0 and nodeSize. No rounding goes
 * past the middle of a segment, so short segments get less.
 */
export function tweakGrid(
  rounding: readonly [number, number],
): Tweak<unknown, unknown> {
  function tweakGrid(
    graph: Graph<unknown, unknown>,
    res: Readonly<LayoutResult>,
  ): LayoutResult {
    for (const link of graph.links()) {
      const { points } = link;
      if (link.source !== link.target && points.length > 3) {
        throw err`link points had more than three points: ${points.length}; tweakGrid can only be applied to grid layouts`;
      } else {
        const rounded = points.slice(0, 1);
        for (let ind = 1; ind < points.length - 1; ++ind) {
          const corner = points[ind];
          rounded.push(
            nearCorner(corner, points[ind - 1], rounding),
            corner,
            nearCorner(corner, points[ind + 1], rounding),
          );
        }
        if (points.length > 1) rounded.push(points[points.length - 1]);
        link.points = rounded;
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
 * a shape callable that ends a link where it leaves a node
 *
 * It returns where the segment from `start` to `end` leaves the node, or
 * `undefined` if `end` is inside too; the border counts as outside.
 */
export type Shape = (
  center: readonly [number, number],
  nodeSize: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number],
) => [number, number] | undefined;

/** check whether a point is inside a node's bounding box, not on its border */
function insideRect(
  [cx, cy]: readonly [number, number],
  [width, height]: readonly [number, number],
  [x, y]: readonly [number, number],
): boolean {
  return (
    cx - width / 2 < x &&
    x < cx + width / 2 &&
    cy - height / 2 < y &&
    y < cy + height / 2
  );
}

/**
 * a bounding box shape for the full rectangle
 *
 * Useful with {@link tweakShape}.
 */
export function shapeRect(
  center: readonly [number, number],
  nodeSize: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number],
): [number, number] | undefined {
  const [cx, cy] = center;
  const [width, height] = nodeSize;
  const [sx, sy] = start;
  const [ex, ey] = end;
  const xmin = cx - width / 2;
  const xmax = cx + width / 2;
  const ymin = cy - height / 2;
  const ymax = cy + height / 2;

  if (!insideRect(center, nodeSize, start)) {
    return [sx, sy];
  } else if (insideRect(center, nodeSize, end)) {
    return undefined;
  } else {
    const dx = ex - sx;
    const dy = ey - sy;
    const xedge = dx > 0 ? xmax : xmin;
    const yedge = dy > 0 ? ymax : ymin;
    const xfrac = dx ? (xedge - sx) / dx : Infinity;
    const yfrac = dy ? (yedge - sy) / dy : Infinity;
    if (xfrac >= 1 && yfrac >= 1) {
      // start + delta can miss end by rounding
      return [ex, ey];
    } else if (xfrac < yfrac) {
      return [xedge, sy + xfrac * dy];
    } else {
      return [sx + yfrac * dx, yedge];
    }
  }
}

/**
 * a bounding box shape for an ellipse
 *
 * Useful with {@link tweakShape}.
 */
export function shapeEllipse(
  center: readonly [number, number],
  nodeSize: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number],
): [number, number] | undefined {
  const [width, height] = nodeSize;
  if (!width || !height) {
    // a flat ellipse is its bounding box
    return shapeRect(center, nodeSize, start, end);
  } else {
    const [cx, cy] = center;
    const [sx, sy] = start;
    const [ex, ey] = end;
    const a2 = (width / 2) ** 2;
    const b2 = (height / 2) ** 2;

    // negative inside the ellipse, zero on its border
    function level(x: number, y: number): number {
      return b2 * (x - cx) ** 2 + a2 * (y - cy) ** 2 - a2 * b2;
    }

    const startLevel = level(sx, sy);
    if (startLevel >= 0) {
      return [sx, sy];
    } else if (level(ex, ey) < 0) {
      return undefined;
    } else {
      // the larger root of level along the segment, which is in [0, 1]
      const dx = ex - sx;
      const dy = ey - sy;
      const quad = b2 * dx * dx + a2 * dy * dy;
      const half = b2 * dx * (sx - cx) + a2 * dy * (sy - cy);
      const frac = (Math.sqrt(half * half - quad * startLevel) - half) / quad;
      return [sx + frac * dx, sy + frac * dy];
    }
  }
}

/**
 * a shape that aligns edges with the centered top or bottom of a node
 *
 * A link leaves from whichever of the two it heads toward.
 *
 * Useful with {@link tweakShape}.
 */
export function shapeTopBottom(
  center: readonly [number, number],
  nodeSize: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number],
): [number, number] | undefined {
  const [cx, cy] = center;
  const [width, height] = nodeSize;
  const [sx, sy] = start;
  const [, ey] = end;
  const top = cy - height / 2;
  const bottom = cy + height / 2;

  if (!insideRect(center, nodeSize, start)) {
    return [sx, sy];
  } else if (insideRect(center, nodeSize, end)) {
    return undefined;
  } else if (ey < sy) {
    return [cx, top];
  } else if (ey > sy) {
    return [cx, bottom];
  } else {
    throw err`line from ${start} -> ${end} leaves the side of the node at [${cx}, ${cy}] with size [${width}, ${height}], heading neither up nor down`;
  }
}

/** whether two points differ by no more than rounding */
function nearlyEqual(
  [ax, ay]: readonly [number, number],
  [bx, by]: readonly [number, number],
): boolean {
  const tol =
    1e-9 * Math.max(Math.abs(ax), Math.abs(ay), Math.abs(bx), Math.abs(by));
  return Math.abs(ax - bx) <= tol && Math.abs(ay - by) <= tol;
}

/** remove the points of a link that start in a node up to where it leaves */
function trimStart(
  points: [number, number][],
  center: readonly [number, number],
  size: readonly [number, number],
  shape: Shape,
): void {
  for (let ind = 1; ind < points.length; ++ind) {
    const exit = shape(center, size, points[ind - 1], points[ind]);
    if (exit !== undefined) {
      // a link keeps two points, so between touching nodes it repeats the point
      // they share
      if (ind + 1 < points.length && nearlyEqual(exit, points[ind])) {
        points.splice(0, ind);
      } else {
        points.splice(0, ind, exit);
      }
      return;
    }
  }
  const [cx, cy] = center;
  const [width, height] = size;
  throw err`link with points ${points} lies entirely inside the node at [${cx}, ${cy}] with size [${width}, ${height}]; do nodes overlap?`;
}

/**
 * tweak the layout by truncating edges early
 *
 * This tweak ends each link where it leaves the {@link Shape} of each node it
 * connects, sized by the node's bounding box. It scans the link from each end,
 * dropping every segment inside the node, and cuts the first segment that
 * leaves it. After applying this tweak, edge endings like arrows can be easily
 * rendered in the appropriate place.
 *
 * There are three built in {@link Shape}s:
 * - {@link shapeRect} - a simple rectangle
 * - {@link shapeEllipse} - an ellipse (circle for square node sizes)
 * - {@link shapeTopBottom} - to center edges into the top or bottom of a node
 *
 * @throws if a link lies entirely inside a node, as when nodes overlap
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
      for (const { points } of node.childLinks()) {
        trimStart(points, center, size, shape);
      }
      for (const { points } of node.parentLinks()) {
        points.reverse();
        trimStart(points, center, size, shape);
        points.reverse();
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
 * If using in conjunction with {@link tweakShape}, this should occur first:
 * applied after, it can add a point where tweakShape already ended a link.
 */
export function tweakSugiyama<N, L>(nodeSize: NodeSize<N, L>): Tweak<N, L> {
  function tweakSugiyama(
    graph: Graph<N, L>,
    res: Readonly<LayoutResult>,
  ): LayoutResult {
    const cachedSize = cachedNodeSize(nodeSize);
    for (const { source, target, points } of graph.links()) {
      // compute both clips before any mutation to handle two-point edges
      const srcSize = cachedSize(source);
      const srcXrange = [
        source.x - srcSize[0] / 2,
        source.x + srcSize[0] / 2,
      ] as const;
      const srcYs = [source.y - srcSize[1] / 2, source.y + srcSize[1] / 2];
      const srcClip = findClip(points[0], points[1], srcYs, srcXrange);

      const tgtSize = cachedSize(target);
      const tgtXrange = [
        target.x - tgtSize[0] / 2,
        target.x + tgtSize[0] / 2,
      ] as const;
      const tgtYs = [target.y - tgtSize[1] / 2, target.y + tgtSize[1] / 2];
      const tgtClip = findClip(
        points[points.length - 2],
        points[points.length - 1],
        tgtYs,
        tgtXrange,
      );

      // insert target first so source index isn't shifted
      if (tgtClip) points.splice(-1, 0, tgtClip);
      if (srcClip) points.splice(1, 0, srcClip);
    }
    return res;
  }

  return tweakSugiyama;
}

/**
 * tweak grid edge bend points to the midpoint of the gap between rows
 *
 * Grid layouts place bend points at source or target y-levels, which can
 * cause edges to kink when rendered with handle-based frameworks like React
 * Flow. This tweak moves interior bend points to the midpoint of the gap
 * between rows (bottom of node + half of y gap), producing smoother edges.
 *
 * @remarks
 *
 * This should be applied before flip tweaks.
 */
export function tweakGridHandles<N, L>(
  nodeSize: NodeSize<N, L>,
  gap: readonly [number, number],
): Tweak<N, L> {
  const [, ygap] = gap;

  function tweakGridHandles(
    graph: Graph<N, L>,
    res: Readonly<LayoutResult>,
  ): LayoutResult {
    const cachedSize = cachedNodeSize(nodeSize);
    for (const link of graph.links()) {
      const { source, target, points } = link;
      const [, middle, last] = points;
      if (last === undefined) continue; // vertical
      const [, srcH] = cachedSize(source);
      const [, tgtH] = cachedSize(target);
      // shift interior bend points to midpoint of the gap between rows
      const [, my] = middle;
      if (my === source.y) {
        middle[1] += srcH / 2 + ygap / 2;
      } else if (my === target.y) {
        middle[1] -= tgtH / 2 + ygap / 2;
      }
    }
    return res;
  }

  return tweakGridHandles;
}

/**
 * tweak the layout to apply a direction
 *
 * Layouts produce top-to-bottom (TB) output by default. This tweak converts
 * the layout to the given direction by composing the appropriate flips.
 *
 * @remarks
 *
 * This should be applied after all other tweaks.
 */
export function tweakDirection(direction: Rankdir): Tweak<unknown, unknown> {
  if (direction === "TB") {
    return (_, res) => res;
  } else if (direction === "BT") {
    return tweakFlip("vertical");
  } else if (direction === "LR") {
    return tweakFlip("diagonal");
  } else {
    const diag = tweakFlip("diagonal");
    const horiz = tweakFlip("horizontal");
    return (graph, res) => horiz(graph, diag(graph, res));
  }
}
