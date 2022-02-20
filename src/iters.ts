/**
 * Stopgap for esnext iterable features
 *
 * @module
 */

export function* entries<T>(iter: Iterable<T>): Iterable<readonly [number, T]> {
  let index = 0;
  for (const element of iter) {
    yield [index++, element];
  }
}

export function* flatMap<T, S>(
  iter: Iterable<T>,
  callback: (element: T, index: number) => Iterable<S>
): Iterable<S> {
  for (const [index, element] of entries(iter)) {
    yield* callback(element, index);
  }
}

export function reduce<T, S>(
  iter: Iterable<T>,
  callback: (accumulator: S, currentValue: T, index: number) => S,
  initialValue: S
): S {
  const call = callback as (
    accumulator: S,
    currentValue: T,
    index: number
  ) => S;
  let accumulator = initialValue;
  for (const [index, element] of entries(iter)) {
    accumulator = call(accumulator, element, index);
  }
  return accumulator;
}

export function* map<T, S>(
  iter: Iterable<T>,
  callback: (element: T, index: number) => S
): Iterable<S> {
  for (const [index, element] of entries(iter)) {
    yield callback(element, index);
  }
}

export function every<T>(
  iter: Iterable<T>,
  callback: (element: T, index: number) => boolean
): boolean {
  for (const [index, element] of entries(iter)) {
    if (!callback(element, index)) {
      return false;
    }
  }
  return true;
}

export function* reverse<T>(arr: readonly T[]): Iterable<T> {
  for (let i = arr.length; i != 0; ) {
    yield arr[--i];
  }
}
