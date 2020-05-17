type OfAble<T> = Iterator<T> | Iterable<T>;

class LazyFluentIterator<T>
  implements Iterator<T, undefined, undefined>, Iterable<T> {
  constructor(private readonly base: Iterator<T>) {}

  [Symbol.iterator](): Iterator<T, undefined, undefined> {
    return this;
  }

  next(): IteratorYieldResult<T> | IteratorReturnResult<undefined> {
    const { value, done } = this.base.next();
    if (done) {
      return { value: undefined, done: true };
    } else {
      return { value, done: false };
    }
  }

  concat(...others: OfAble<T>[]): FluentIterator<T> {
    return new LazyFluentIterator(
      (function* (iters: Iterable<T>[]): Iterator<T> {
        for (const iter of iters) {
          yield* iter;
        }
      })([this, ...others.map(fluent)])
    );
  }

  entries(): FluentIterator<[number, T]> {
    return new LazyFluentIterator(
      (function* (iter: Iterable<T>): Iterator<[number, T]> {
        let index = 0;
        for (const element of iter) {
          yield [index++, element];
        }
      })(this)
    );
  }

  every(callback: (element: T, index: number) => boolean): boolean {
    return !this.some((elem, ind) => !callback(elem, ind));
  }

  fill<S>(val: S): FluentIterator<S> {
    return this.map(() => val);
  }

  filter(callback: (element: T, index: number) => boolean): FluentIterator<T> {
    return new LazyFluentIterator(
      (function* (iter: Iterable<[number, T]>): Iterator<T> {
        for (const [index, element] of iter) {
          if (callback(element, index)) {
            yield element;
          }
        }
      })(this.entries())
    );
  }

  find(callback: (element: T, index: number) => boolean): T | undefined {
    for (const [index, element] of this.entries()) {
      if (callback(element, index)) {
        return element;
      }
    }
    return undefined;
  }

  findIndex(callback: (element: T, index: number) => boolean): number {
    for (const [index, element] of this.entries()) {
      if (callback(element, index)) {
        return index;
      }
    }
    return -1;
  }

  flatMap<S>(
    callback: (element: T, index: number) => OfAble<S>
  ): FluentIterator<S> {
    return new LazyFluentIterator(
      (function* (iter: Iterable<[number, T]>): Iterator<S> {
        for (const [index, element] of iter) {
          yield* fluent(callback(element, index));
        }
      })(this.entries())
    );
  }

  forEach(callback: (element: T, index: number) => void): void {
    for (const [index, element] of this.entries()) {
      callback(element, index);
    }
  }

  includes(query: T, fromIndex: number = 0): boolean {
    return this.indexOf(query, fromIndex) >= 0;
  }

  indexOf(query: T, fromIndex: number = 0): number {
    if (fromIndex < 0) {
      throw new Error(
        `fromIndex doesn't support negative numbers because generator length isn't known`
      );
    }
    for (const [index, element] of this.entries()) {
      if (index >= fromIndex && element === query) {
        return index;
      }
    }
    return -1;
  }

  join(separator: string = ","): string {
    return [...this].join(separator);
  }

  keys(): FluentIterator<number> {
    return new LazyFluentIterator(
      (function* (iter: Iterable<T>): Iterator<number> {
        let index = 0;
        for (const _ of iter) {
          yield index++;
        }
      })(this)
    );
  }

  lastIndexOf(query: T, fromIndex: number = Infinity): number {
    if (fromIndex < 0) {
      throw new Error(
        `fromIndex doesn't support negative numbers because generator length isn't known`
      );
    }
    let lastIndex = -1;
    for (const [index, element] of this.entries()) {
      if (index <= fromIndex && element === query) {
        lastIndex = index;
      }
    }
    return lastIndex;
  }

  get length(): number {
    return this.reduce((a) => a + 1, 0);
  }

  map<S>(callback: (element: T, index: number) => S): FluentIterator<S> {
    return new LazyFluentIterator(
      (function* (iter: Iterable<[number, T]>): Iterator<S> {
        for (const [index, element] of iter) {
          yield callback(element, index);
        }
      })(this.entries())
    );
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
      let accumulator: T = (undefined as unknown) as T;
      for (const [index, element] of this.entries()) {
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
      for (const [index, element] of this.entries()) {
        accumulator = call(accumulator, element, index);
      }
      return accumulator;
    }
  }

  reverse(): FluentIterator<T> {
    return fluent([...this].reverse());
  }

  slice(start: number = 0, end: number = Infinity): FluentIterator<T> {
    return new LazyFluentIterator(
      (function* (iter: Iterable<[number, T]>): Iterator<T> {
        for (const [index, element] of iter) {
          if (index < start) {
            // do nothing
          } else if (index < end) {
            yield element;
          } else {
            break; // no more elements
          }
        }
      })(this.entries())
    );
  }

  some(callback: (element: T, index: number) => boolean): boolean {
    for (const [index, element] of this.entries()) {
      if (callback(element, index)) {
        return true;
      }
    }
    return false;
  }

  sort(compare?: (first: T, second: T) => number) {
    return fluent([...this].sort(compare));
  }

  splice(
    start: number,
    deleteCount: number = 0,
    ...items: T[]
  ): FluentIterator<T> {
    return new LazyFluentIterator(
      (function* (iter: Iterable<[number, T]>): Iterator<T> {
        for (const [index, element] of iter) {
          if (index === start) {
            yield* items;
          }
          if (index < start || index >= start + deleteCount) {
            yield element;
          }
        }
      })(this.entries())
    );
  }

  values(): FluentIterator<T> {
    return this;
  }
}

export type FluentIterator<T> = LazyFluentIterator<T>;

function isIterable(seq: OfAble<unknown>): seq is Iterable<unknown> {
  return typeof (seq as Iterable<unknown>)[Symbol.iterator] === "function";
}

export function fluent<T>(seq: OfAble<T>): FluentIterator<T> {
  if (isIterable(seq)) {
    return new LazyFluentIterator(seq[Symbol.iterator]());
  } else {
    return new LazyFluentIterator(seq);
  }
}
