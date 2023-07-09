/**
 * Stopgap for esnext iterable features
 *
 * @internal
 * @packageDocumentation
 */
import { err } from "./utils";

/** iterable callback that maps a value into another */
export interface MapCallback<in T, out S> {
  (element: T, index: number): S;
}

/** iterable callback that maps a value into another */
export interface GuardCallback<in T, R extends T> {
  (element: T, index: number): element is R;
}

/** reduce callback */
export interface ReduceCallback<in T, in out S> {
  (accumulator: S, currentValue: T, index: number): S;
}

/** filter guard callback */
export interface FilterGuardCallback<in T, out S extends T> {
  (element: T, index: number): element is S;
}

/** elements with their zero based index */
export function* entries<T>(iter: Iterable<T>): IterableIterator<[number, T]> {
  let index = 0;
  for (const element of iter) {
    yield [index++, element];
  }
}

/** iterable flat map */
export function* flatMap<T, S>(
  iter: Iterable<T>,
  callback: MapCallback<T, Iterable<S>>,
): IterableIterator<S> {
  for (const [index, element] of entries(iter)) {
    yield* callback(element, index);
  }
}

/** iterable reduce */
export function reduce<T, S>(
  iter: Iterable<T>,
  callback: ReduceCallback<T, S>,
  initialValue: S,
): S {
  let accumulator = initialValue;
  for (const [index, element] of entries(iter)) {
    accumulator = callback(accumulator, element, index);
  }
  return accumulator;
}

/** iterable map */
export function* map<T, S>(
  iter: Iterable<T>,
  callback: MapCallback<T, S>,
): IterableIterator<S> {
  for (const [index, element] of entries(iter)) {
    yield callback(element, index);
  }
}

/** guard iterable filter */
export function filter<T, S extends T>(
  iter: Iterable<T>,
  callback: FilterGuardCallback<T, S>,
): IterableIterator<S>;
/** generic iterable filter */
export function filter<T>(
  iter: Iterable<T>,
  callback: MapCallback<T, boolean>,
): IterableIterator<T>;
export function* filter<T>(
  iter: Iterable<T>,
  callback: MapCallback<T, boolean>,
): IterableIterator<T> {
  for (const [index, element] of entries(iter)) {
    if (callback(element, index)) {
      yield element;
    }
  }
}

/** iterable some */
export function some<T>(
  iter: Iterable<T>,
  callback: MapCallback<T, boolean>,
): boolean {
  for (const [index, element] of entries(iter)) {
    if (callback(element, index)) {
      return true;
    }
  }
  return false;
}

/** iterable every */
export function every<T, R extends T>(
  iter: Iterable<T>,
  callback: GuardCallback<T, R>,
): iter is Iterable<R>;
export function every<T>(
  iter: Iterable<T>,
  callback: MapCallback<T, boolean>,
): boolean;
export function every<T>(
  iter: Iterable<T>,
  callback: MapCallback<T, boolean>,
): boolean {
  return !some(iter, (e, i) => !callback(e, i));
}

/** iterable length */
export function length(iter: Iterable<unknown>): number {
  let count = 0;
  for (const _ of iter) ++count;
  return count;
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

/** iterable reverse of an array */
export function reverse<T>(arr: readonly T[]): IterableIterator<T> {
  return slice(arr, arr.length - 1, -1, -1);
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
    let next;
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
