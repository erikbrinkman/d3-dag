/** utility type for replacing keys with new value */
export type Replace<O, K extends keyof O, N> = Omit<O, K> & { [key in K]: N };

/** helper for verifying things aren't undefined */
export function def<T>(val: T | undefined): T {
  /* istanbul ignore else: only for unaccounted for errors */
  if (val !== undefined) {
    return val;
  } else {
    throw new Error("got unexpected undefined value");
  }
}

/** assert something */
export function assert(
  statement: unknown,
  msg: string = "failed assert"
): asserts statement {
  if (!statement) {
    throw new Error(`internal error: ${msg}`);
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
