/**
 * Utilities for working with collections
 *
 * @packageDocumentation
 */

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
 * returns a single arbitrary element from the Set, or undefined if empty
 */
export function setNext<T>(elems: Set<T>): T | undefined {
  for (const elem of elems) return elem;
  return undefined;
}

/**
 * removes a single arbitrary element from the Set, or undefined if missing
 *
 * @remarks
 * if the set contains undefined, then this doesn't distinguish in output,
 * but will properly remove it.
 */
export function setPop<T>(elems: Set<T>): T | undefined {
  for (const elem of elems) {
    elems.delete(elem);
    return elem;
  }
  return undefined;
}

/**
 * push val onto key list for multimap
 */
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

/**
 * add val to key set for multimap
 */
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

/**
 * delete val from key set for multimap
 */
export function setMultimapDelete<K, V>(
  multimap: Map<K, Set<V>>,
  key: K,
  val: V
): void {
  const value = multimap.get(key);
  if (value !== undefined) {
    value.delete(val);
    if (!value.size) {
      multimap.delete(key);
    }
  }
}
