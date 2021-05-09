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
