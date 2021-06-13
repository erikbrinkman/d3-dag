/**
 * Stopgap for esnext iterable features
 *
 * We use this over `fluent-iterable` because that package is out of date, and
 * there's no need to invoke another dependency just for this.
 *
 * @module
 */

/**
 * A fluent iterable
 *
 * This interface provides array method access to iterables that are lazy and
 * only applied when the iterator is consumed.
 */
export interface FluentIterable<T> extends Iterable<T> {
  /**
   * Concatenate several iterables together
   */
  concat(...others: Iterable<T>[]): FluentIterable<T>;

  /**
   * Return a tuple of the index paired with each element
   */
  entries(): FluentIterable<[number, T]>;

  /**
   * Return true if callback is true for ever element of the iterable
   */
  every(callback: (element: T, index: number) => boolean): boolean;

  /**
   * Return a new iterable where every value is val
   */
  fill<S>(val: S): FluentIterable<S>;

  /**
   * Return a new iterable where callback is true for the elements
   */
  filter<P extends T>(
    callback: (element: T, index: number) => element is P
  ): FluentIterable<P>;
  filter(callback: (element: T, index: number) => boolean): FluentIterable<T>;

  /**
   * Return the first element that passes callback
   */
  find<P extends T>(
    callback: (element: T, index: number) => element is P
  ): P | undefined;
  find(callback: (element: T, index: number) => boolean): T | undefined;

  /**
   * Return the index of the first element that passes callback
   */
  findIndex(callback: (element: T, index: number) => boolean): number;

  /**
   * Map to an interable, and flatten the result
   */
  flatMap<S>(
    callback: (element: T, index: number) => Iterable<S>
  ): FluentIterable<S>;

  /**
   * Call the callback for each element in iterable
   */
  forEach(callback: (element: T, index: number) => void): void;

  /**
   * Return true if the element is in iterable after `fromIndex`
   */
  includes(query: T, fromIndex?: number): boolean;

  /**
   * Return the index of the `query` in iterable if it's after `fromIndex`
   */
  indexOf(query: T, fromIndex?: number): number;

  /**
   * Join every element with a delimiter
   */
  join(separator?: string): string;

  /**
   * Return the indices of every element
   */
  keys(): FluentIterable<number>;

  /**
   * Return the last index of `query` in iterable after `fromIndex`
   */
  lastIndexOf(query: T, fromIndex?: number): number;

  /**
   * The number of elements in the iterable
   */
  readonly length: number;

  /**
   * Map every element in the iterable using callback
   */
  map<S>(callback: (element: T, index: number) => S): FluentIterable<S>;

  /**
   * Return the iterable using callback
   */
  reduce(callback: (accumulator: T, currentValue: T, index: number) => T): T;
  reduce<S>(
    callback: (accumulator: S, currentValue: T, index: number) => S,
    initialValue: S
  ): S;

  /**
   * Reverse the iterable
   */
  reverse(): FluentIterable<T>;

  /**
   * Slice the iterable
   */
  slice(start?: number, end?: number): FluentIterable<T>;

  /**
   * Return true if any element in the iterable is true for callback
   */
  some(callback: (element: T, index: number) => boolean): boolean;

  /**
   * Sort the iterable using the optional compare function
   */
  sort(compare?: (first: T, second: T) => number): FluentIterable<T>;

  /**
   * Splice the iterable
   */
  splice(start: number, deleteCount?: number, ...items: T[]): FluentIterable<T>;

  /**
   * Return this iterable
   */
  values(): FluentIterable<T>;
}

/**
 * The implementation of {@link FluentIterable}
 */
class LazyFluentIterable<T> implements FluentIterable<T> {
  constructor(private readonly base: Iterable<T>) {}

  [Symbol.iterator](): Iterator<T> {
    return this.base[Symbol.iterator]();
  }

  private *gconcat(...others: Iterable<T>[]): Generator<T, void, undefined> {
    yield* this;
    for (const iter of others) {
      yield* iter;
    }
  }

  concat(...others: Iterable<T>[]): FluentIterable<T> {
    return fluent(this.gconcat(...others));
  }

  private *gentries(): Generator<[number, T]> {
    let index = 0;
    for (const element of this) {
      yield [index++, element];
    }
  }

  entries(): FluentIterable<[number, T]> {
    return fluent(this.gentries());
  }

  every(callback: (element: T, index: number) => boolean): boolean {
    return !this.some((elem, ind) => !callback(elem, ind));
  }

  fill<S>(val: S): FluentIterable<S> {
    return this.map(() => val);
  }

  private *gfilter(
    callback: (element: T, index: number) => boolean
  ): Generator<T> {
    for (const [index, element] of this.gentries()) {
      if (callback(element, index)) {
        yield element;
      }
    }
  }

  filter(callback: (element: T, index: number) => boolean): FluentIterable<T> {
    return fluent(this.gfilter(callback));
  }

  find(callback: (element: T, index: number) => boolean): T | undefined {
    for (const [index, element] of this.gentries()) {
      if (callback(element, index)) {
        return element;
      }
    }
    return undefined;
  }

  findIndex(callback: (element: T, index: number) => boolean): number {
    for (const [index, element] of this.gentries()) {
      if (callback(element, index)) {
        return index;
      }
    }
    return -1;
  }

  private *gflatMap<S>(
    callback: (element: T, index: number) => Iterable<S>
  ): Generator<S, void, undefined> {
    for (const [index, element] of this.gentries()) {
      yield* callback(element, index);
    }
  }

  flatMap<S>(
    callback: (element: T, index: number) => Iterable<S>
  ): FluentIterable<S> {
    return fluent(this.gflatMap(callback));
  }

  forEach(callback: (element: T, index: number) => void): void {
    for (const [index, element] of this.gentries()) {
      callback(element, index);
    }
  }

  includes(query: T, fromIndex: number = 0): boolean {
    return this.indexOf(query, fromIndex) >= 0;
  }

  indexOf(query: T, fromIndex: number = 0): number {
    if (fromIndex < 0) {
      // NOTE this could be done with a deque, but since this is eventually
      // going to be part of the spec and is unused, this is easier
      throw new Error(
        `fromIndex doesn't support negative numbers because generator length isn't known`
      );
    }
    for (const [index, element] of this.gentries()) {
      if (index >= fromIndex && element === query) {
        return index;
      }
    }
    return -1;
  }

  join(separator: string = ","): string {
    return [...this].join(separator);
  }

  private *gkeys(): Generator<number> {
    let index = 0;
    for (const _ of this) {
      yield index++;
    }
  }

  keys(): FluentIterable<number> {
    return fluent(this.gkeys());
  }

  lastIndexOf(query: T, fromIndex: number = Infinity): number {
    if (fromIndex < 0) {
      // NOTE this could be done with a deque, but since this is eventually
      // going to be part of the spec and is unused, this is easier
      throw new Error(
        `lastIndexOf doesn't support negative numbers because generator length isn't known`
      );
    }
    let lastIndex = -1;
    for (const [index, element] of this.gentries()) {
      if (index <= fromIndex && element === query) {
        lastIndex = index;
      }
    }
    return lastIndex;
  }

  get length(): number {
    return this.reduce((a) => a + 1, 0);
  }

  private *gmap<S>(callback: (element: T, index: number) => S): Generator<S> {
    for (const [index, element] of this.gentries()) {
      yield callback(element, index);
    }
  }

  map<S>(callback: (element: T, index: number) => S): FluentIterable<S> {
    return fluent(this.gmap(callback));
  }

  reduce(callback: (accumulator: T, currentValue: T, index: number) => T): T;
  reduce<S>(
    callback: (accumulator: S, currentValue: T, index: number) => S,
    initialValue: S
  ): S;
  reduce<S>(
    callback:
      | ((accumulator: T, currentValue: T, index: number) => T)
      | ((accumulator: S, currentValue: T, index: number) => S),
    initialValue?: S
  ): S | T {
    if (initialValue === undefined) {
      const call = callback as (
        accumulator: T,
        currentValue: T,
        index: number
      ) => T;
      let first = true;
      let accumulator: T = undefined as unknown as T;
      for (const [index, element] of this.gentries()) {
        if (first) {
          accumulator = element;
          first = false;
        } else {
          accumulator = call(accumulator, element, index);
        }
      }
      if (first) {
        throw new TypeError("Reduce of empty iterable with no initial value");
      }
      return accumulator;
    } else {
      const call = callback as (
        accumulator: S,
        currentValue: T,
        index: number
      ) => S;
      let accumulator = initialValue;
      for (const [index, element] of this.gentries()) {
        accumulator = call(accumulator, element, index);
      }
      return accumulator;
    }
  }

  reverse(): FluentIterable<T> {
    return fluent([...this].reverse());
  }

  private *gslice(start: number, end: number): Generator<T> {
    for (const [index, element] of this.gentries()) {
      if (index < start) {
        // do nothing
      } else if (index < end) {
        yield element;
      } else {
        break; // no more elements
      }
    }
  }

  slice(start: number = 0, end: number = Infinity): FluentIterable<T> {
    return fluent(this.gslice(start, end));
  }

  some(callback: (element: T, index: number) => boolean): boolean {
    for (const [index, element] of this.gentries()) {
      if (callback(element, index)) {
        return true;
      }
    }
    return false;
  }

  sort(compare?: (first: T, second: T) => number) {
    return fluent([...this].sort(compare));
  }

  private *gsplice(
    start: number,
    deleteCount: number,
    ...items: T[]
  ): Generator<T, void, undefined> {
    for (const [index, element] of this.gentries()) {
      if (index === start) {
        yield* items;
      }
      if (index < start || index >= start + deleteCount) {
        yield element;
      }
    }
  }

  splice(
    start: number,
    deleteCount: number = 0,
    ...items: T[]
  ): FluentIterable<T> {
    return fluent(this.gsplice(start, deleteCount, ...items));
  }

  values(): FluentIterable<T> {
    return this;
  }
}

/**
 * Create a fluent iterable from a source iterable
 */
export function fluent<T>(seq: Iterable<T> = []): FluentIterable<T> {
  return new LazyFluentIterable(seq);
}
