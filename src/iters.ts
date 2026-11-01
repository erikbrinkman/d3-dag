/**
 * Stopgap for esnext iterable features
 *
 * @internal
 * @packageDocumentation
 */
import { err } from "./utils.js";

/** elements with their zero based index */
export function* entries<T>(iter: Iterable<T>): IterableIterator<[number, T]> {
  let index = 0;
  for (const element of iter) {
    yield [index++, element];
  }
}

function* slicePos<T>(
  arr: readonly T[],
  frm: number,
  to: number,
  stride: number,
): IterableIterator<T> {
  const limit = Math.min(to, arr.length);
  for (let i = frm; i < limit; i += stride) {
    yield arr[i];
  }
}

function* sliceNeg<T>(
  arr: readonly T[],
  frm: number,
  to: number,
  stride: number,
): IterableIterator<T> {
  const limit = Math.max(to, -1);
  for (let i = frm; i > limit; i += stride) {
    yield arr[i];
  }
}

/** iterable slice of an array */
export function slice<T>(
  arr: readonly T[],
  frm: number = 0,
  to: number = arr.length,
  stride: number = 1,
): IterableIterator<T> {
  if (stride > 0) {
    return slicePos(arr, frm, to, stride);
  } else if (stride < 0) {
    return sliceNeg(arr, frm, to, stride);
  } else {
    throw err`can't slice with zero stride`;
  }
}

/** chain several iterables */
export function* chain<T>(...iters: Iterable<T>[]): IterableIterator<T> {
  for (const iter of iters) {
    yield* iter;
  }
}

/** iterate over bigrams of an iterable */
export function* bigrams<T>(iterable: Iterable<T>): IterableIterator<[T, T]> {
  const iter: Iterator<T, unknown> = iterable[Symbol.iterator]();
  const first = iter.next();
  if (!first.done) {
    let last = first.value;
    let next: IteratorResult<T, unknown>;
    while (!(next = iter.next()).done) {
      yield [last, next.value];
      last = next.value;
    }
  }
}

/** return the first element of an iterable */
export function first<T>(iterable: Iterable<T>): T | undefined {
  for (const item of iterable) {
    return item;
  }
}

/** return if something is iterable */
export function isIterable(obj: unknown): obj is Iterable<unknown> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Symbol.iterator in obj &&
    typeof obj[Symbol.iterator] === "function"
  );
}
