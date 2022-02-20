/**
 * General utilities for use throughout the package
 *
 * @internal
 * @module
 */

/** utility type for replacing keys with new value */
export type Up<O, N> = Omit<O, keyof N> & N;

/** assert something */
export function assert(statement: unknown): asserts statement {
  if (!statement) {
    throw new Error("internal error: failed assert");
  }
}

/** determines if two sets are equal */
export function setEqual<T>(first: Set<T>, second: Set<T>): boolean {
  if (second.size !== first.size) {
    return false;
  } else {
    for (const element of first) {
      if (!second.has(element)) {
        return false;
      }
    }
    return true;
  }
}

/** determines if two sets intersect */
export function setIntersect<T>(first: Set<T>, second: Set<T>): boolean {
  if (second.size < first.size) {
    [second, first] = [first, second];
  }
  for (const element of first) {
    if (second.has(element)) {
      return true;
    }
  }
  return false;
}

/**
 * removes a single arbitrary element from the Set, or undefined is missing
 *
 * @remarks
 * if the set contains undefined, then this doesn't distinguish in output,
 * but will properly remove it.
 */
export function setPop<T>(elems: Set<T>): T | undefined {
  const { done, value } = elems.values().next();
  if (done) {
    return undefined;
  } else {
    elems.delete(value);
    return value;
  }
}

// FIXME doc and find places to use
export function listMultimapPush<K, V>(
  multimap: Map<K, V[]>,
  key: K,
  val: V
): void {
  const value = multimap.get(key);
  if (value === undefined) {
    multimap.set(key, [val]);
  } else {
    value.push(val);
  }
}

// FIXME doc and find places to use
export function setMultimapAdd<K, V>(
  multimap: Map<K, Set<V>>,
  key: K,
  val: V
): void {
  const value = multimap.get(key);
  if (value === undefined) {
    multimap.set(key, new Set([val]));
  } else {
    value.add(val);
  }
}

export interface Replacer {
  (key: string, value: unknown): unknown;
}

/** replacer for serializing possibly circular json */
export function getCircularReplacer(): Replacer {
  const seen = new WeakSet();
  return (key: string, value: unknown): unknown => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[circular]";
      }
      seen.add(value);
    }
    return value;
  };
}

/** format tag for converting inputs to json */
export function js(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  const [base, ...rest] = strings;
  return [base]
    .concat(
      ...rest.map((str, i) => [
        JSON.stringify(values[i], getCircularReplacer()),
        str
      ])
    )
    .join("");
}

/** iterate over bigrams of an array */
export function* bigrams<T>(array: readonly T[]): IterableIterator<[T, T]> {
  let [first, ...rest] = array;
  for (const second of rest) {
    yield [first, second];
    first = second;
  }
}

/** depth first search for arbitrary types */
export function* dfs<T>(
  children: (node: T) => Iterable<T>,
  ...queue: T[]
): Generator<T> {
  const seen = new Set<T>();
  let node;
  while ((node = queue.pop())) {
    if (seen.has(node)) continue;
    yield node;
    seen.add(node);
    queue.push(...children(node));
  }
}
