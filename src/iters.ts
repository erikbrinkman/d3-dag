/**
 * Stopgap for esnext iterable features
 *
 * We use this over `fluent-iterable` because that package is out of date, and
 * there's no need to invoke another dependency just for this.
 * @module
 */

/**
 *
 */
export interface FluentIterable<T> extends Iterable<T> {
  concat(...others: Iterable<T>[]): FluentIterable<T>;

  entries(): FluentIterable<[number, T]>;

  every(callback: (element: T, index: number) => boolean): boolean;

  fill<S>(val: S): FluentIterable<S>;

  filter<P extends T>(
    callback: (element: T, index: number) => element is P
  ): FluentIterable<P>;
  filter(callback: (element: T, index: number) => boolean): FluentIterable<T>;

  find<P extends T>(
    callback: (element: T, index: number) => element is P
  ): P | undefined;
  find(callback: (element: T, index: number) => boolean): T | undefined;

  findIndex(callback: (element: T, index: number) => boolean): number;

  flatMap<S>(
    callback: (element: T, index: number) => Iterable<S>
  ): FluentIterable<S>;

  forEach(callback: (element: T, index: number) => void): void;

  includes(query: T, fromIndex?: number): boolean;

  indexOf(query: T, fromIndex?: number): number;

  join(separator?: string): string;

  keys(): FluentIterable<number>;

  lastIndexOf(query: T, fromIndex?: number): number;

  get length(): number;

  map<S>(callback: (element: T, index: number) => S): FluentIterable<S>;

  reduce(callback: (accumulator: T, currentValue: T, index: number) => T): T;
  reduce<S>(
    callback: (accumulator: S, currentValue: T, index: number) => S,
    initialValue: S
  ): S;

  reverse(): FluentIterable<T>;

  slice(start?: number, end?: number): FluentIterable<T>;

  some(callback: (element: T, index: number) => boolean): boolean;

  sort(compare?: (first: T, second: T) => number): FluentIterable<T>;

  splice(start: number, deleteCount?: number, ...items: T[]): FluentIterable<T>;

  values(): FluentIterable<T>;
}

class LazyFluentIterable<T> implements FluentIterable<T> {
  constructor(private readonly base: Iterable<T>) {}

  [Symbol.iterator](): Iterator<T> {
    return this.base[Symbol.iterator]();
  }

  *#concat(...others: Iterable<T>[]): Generator<T, void, undefined> {
    yield* this;
    for (const iter of others) {
      yield* iter;
    }
  }

  concat(...others: Iterable<T>[]): FluentIterable<T> {
    return fluent(this.#concat(...others));
  }

  *#entries(): Generator<[number, T]> {
    let index = 0;
    for (const element of this) {
      yield [index++, element];
    }
  }

  entries(): FluentIterable<[number, T]> {
    return fluent(this.#entries());
  }

  every(callback: (element: T, index: number) => boolean): boolean {
    return !this.some((elem, ind) => !callback(elem, ind));
  }

  fill<S>(val: S): FluentIterable<S> {
    return this.map(() => val);
  }

  *#filter(callback: (element: T, index: number) => boolean): Generator<T> {
    for (const [index, element] of this.#entries()) {
      if (callback(element, index)) {
        yield element;
      }
    }
  }

  filter(callback: (element: T, index: number) => boolean): FluentIterable<T> {
    return fluent(this.#filter(callback));
  }

  find(callback: (element: T, index: number) => boolean): T | undefined {
    for (const [index, element] of this.#entries()) {
      if (callback(element, index)) {
        return element;
      }
    }
    return undefined;
  }

  findIndex(callback: (element: T, index: number) => boolean): number {
    for (const [index, element] of this.#entries()) {
      if (callback(element, index)) {
        return index;
      }
    }
    return -1;
  }

  *#flatMap<S>(
    callback: (element: T, index: number) => Iterable<S>
  ): Generator<S, void, undefined> {
    for (const [index, element] of this.#entries()) {
      yield* callback(element, index);
    }
  }

  flatMap<S>(
    callback: (element: T, index: number) => Iterable<S>
  ): FluentIterable<S> {
    return fluent(this.#flatMap(callback));
  }

  forEach(callback: (element: T, index: number) => void): void {
    for (const [index, element] of this.#entries()) {
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
    for (const [index, element] of this.#entries()) {
      if (index >= fromIndex && element === query) {
        return index;
      }
    }
    return -1;
  }

  join(separator: string = ","): string {
    return [...this].join(separator);
  }

  *#keys(): Generator<number> {
    let index = 0;
    for (const _ of this) {
      yield index++;
    }
  }

  keys(): FluentIterable<number> {
    return fluent(this.#keys());
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
    for (const [index, element] of this.#entries()) {
      if (index <= fromIndex && element === query) {
        lastIndex = index;
      }
    }
    return lastIndex;
  }

  get length(): number {
    return this.reduce((a) => a + 1, 0);
  }

  *#map<S>(callback: (element: T, index: number) => S): Generator<S> {
    for (const [index, element] of this.#entries()) {
      yield callback(element, index);
    }
  }

  map<S>(callback: (element: T, index: number) => S): FluentIterable<S> {
    return fluent(this.#map(callback));
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
      for (const [index, element] of this.#entries()) {
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
      for (const [index, element] of this.#entries()) {
        accumulator = call(accumulator, element, index);
      }
      return accumulator;
    }
  }

  reverse(): FluentIterable<T> {
    return fluent([...this].reverse());
  }

  *#slice(start: number, end: number): Generator<T> {
    for (const [index, element] of this.#entries()) {
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
    return fluent(this.#slice(start, end));
  }

  some(callback: (element: T, index: number) => boolean): boolean {
    for (const [index, element] of this.#entries()) {
      if (callback(element, index)) {
        return true;
      }
    }
    return false;
  }

  sort(compare?: (first: T, second: T) => number) {
    return fluent([...this].sort(compare));
  }

  *#splice(
    start: number,
    deleteCount: number,
    ...items: T[]
  ): Generator<T, void, undefined> {
    for (const [index, element] of this.#entries()) {
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
    return fluent(this.#splice(start, deleteCount, ...items));
  }

  values(): FluentIterable<T> {
    return this;
  }
}

export function fluent<T>(seq: Iterable<T>): FluentIterable<T> {
  return new LazyFluentIterable(seq);
}
