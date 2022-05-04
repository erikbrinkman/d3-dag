/**
 * Stopgap for esnext iterable features
 *
 * @internal
 * @packageDocumentation
 */

/** iterable callback that maps a value into another */
export interface MapCallback<T, S> {
  (element: T, index: number): S;
}

/** reduce callback */
export interface ReduceCallback<T, S> {
  (accumulator: S, currentValue: T, index: number): S;
}

/** filter guard callback */
export interface FilterGuardCallback<T, S extends T> {
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
  callback: MapCallback<T, Iterable<S>>
): IterableIterator<S> {
  for (const [index, element] of entries(iter)) {
    yield* callback(element, index);
  }
}

/** iterable reduce */
export function reduce<T, S>(
  iter: Iterable<T>,
  callback: ReduceCallback<T, S>,
  initialValue: S
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
  callback: MapCallback<T, S>
): IterableIterator<S> {
  for (const [index, element] of entries(iter)) {
    yield callback(element, index);
  }
}

/** guard iterable filter */
export function filter<T, S extends T>(
  iter: Iterable<T>,
  callback: FilterGuardCallback<T, S>
): IterableIterator<S>;
/** generic iterable filter */
export function filter<T>(
  iter: Iterable<T>,
  callback: MapCallback<T, boolean>
): IterableIterator<T>;
export function* filter<T>(
  iter: Iterable<T>,
  callback: MapCallback<T, boolean>
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
  callback: MapCallback<T, boolean>
): boolean {
  for (const [index, element] of entries(iter)) {
    if (callback(element, index)) {
      return true;
    }
  }
  return false;
}

/** iterable every */
export function every<T>(
  iter: Iterable<T>,
  callback: MapCallback<T, boolean>
): boolean {
  return !some(iter, (e, i) => !callback(e, i));
}

/** iterator over array reverse */
export function* reverse<T>(arr: readonly T[]): IterableIterator<T> {
  for (let i = arr.length; i != 0; ) {
    yield arr[--i];
  }
}
