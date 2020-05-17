/** helper for verifying things aren't undefined */
export function def<T>(val: T | undefined): T {
  /* istanbul ignore else: only for unaccounted for errors */
  if (val !== undefined) {
    return val;
  } else {
    throw new Error("got unexpected undefined value");
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

/** map with extra convenience functions */
export class SafeMap<K, V> extends Map<K, V> {
  /** throw an error if key not in map */
  getThrow(key: K): V {
    const value = this.get(key);
    if (value === undefined) {
      throw new Error(`map doesn't contain key: ${key}`);
    } else {
      return value;
    }
  }

  /** get with a default if key is not present */
  getDefault(key: K, def: V): V {
    const value = this.get(key);
    if (value === undefined) {
      return def;
    } else {
      return value;
    }
  }

  /** get with a default, but also set default */
  setIfAbsent(key: K, def: V): V {
    const value = this.get(key);
    if (value === undefined) {
      this.set(key, def);
      return def;
    } else {
      return value;
    }
  }
}
