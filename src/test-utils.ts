import type { Graph } from "./graph/index.js";
import { err } from "./utils.js";

/** assert something */
export function assert(statement: unknown): asserts statement {
  if (!statement) {
    throw err`failed assert`;
  }
}

type Point = readonly [number, number];

function turn([ax, ay]: Point, [bx, by]: Point, [cx, cy]: Point): number {
  const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return Math.abs(cross) < 1e-9 ? 0 : Math.sign(cross);
}

function crosses(
  [first, second]: readonly [Point, Point],
  [third, fourth]: readonly [Point, Point],
): boolean {
  const thirdSide = turn(first, second, third);
  const fourthSide = turn(first, second, fourth);
  const firstSide = turn(third, fourth, first);
  const secondSide = turn(third, fourth, second);
  return (
    thirdSide !== 0 &&
    fourthSide !== 0 &&
    firstSide !== 0 &&
    secondSide !== 0 &&
    thirdSide !== fourthSide &&
    firstSide !== secondSide
  );
}

function segments(points: readonly Point[]): [Point, Point][] {
  return points.slice(1).map((point, ind) => [points[ind], point]);
}

/** count where self loops cross other links, away from their ends */
export function loopCrossings(grf: Graph<unknown, unknown>): number {
  const links = [...grf.links()];
  let count = 0;
  for (const loop of links) {
    if (loop.source === loop.target) {
      for (const link of links) {
        if (link !== loop) {
          for (const loopSeg of segments(loop.points)) {
            for (const linkSeg of segments(link.points)) {
              if (crosses(loopSeg, linkSeg)) count += 1;
            }
          }
        }
      }
    }
  }
  return count;
}
