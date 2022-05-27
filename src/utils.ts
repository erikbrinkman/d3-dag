/**
 * General utilities for use throughout the package
 *
 * @packageDocumentation
 */
import stringify from "stringify-object";
import { entries, map } from "./iters";

/** utility type for replacing keys with new value */
export type Up<O, N> = Omit<O, keyof N> & N;

/** utility type for replacing keys with new value */
export type U<O, K extends keyof O, V> = Omit<O, K> & Record<K, V>;

/** a callback for things with children */
export interface ChildrenCallback<T> {
  (node: T): Iterable<T>;
}

/** depth first search for arbitrary types */
export function* dfs<T>(
  children: ChildrenCallback<T>,
  ...queue: T[]
): IterableIterator<T> {
  const seen = new Set<T>();
  let node;
  while ((node = queue.pop()) !== undefined) {
    if (seen.has(node)) continue;
    yield node;
    seen.add(node);
    queue.push(...children(node));
  }
}

/**
 * Interleave a larger array with a smaller iterable
 *
 * common part of template formatting
 */
function interleave(
  larger: readonly string[],
  smaller: Iterable<string>
): string {
  const formatted = [];
  for (const [i, val] of entries(smaller)) {
    formatted.push(larger[i]);
    formatted.push(val);
  }
  formatted.push(larger[larger.length - 1]);
  return formatted.join("");
}

/** pretty error creation */
export function err(strings: readonly string[], ...objs: unknown[]): Error {
  const stringified = map(objs, (val) =>
    stringify(val, {
      indent: "  ",
      singleQuotes: false,
      inlineCharacterLimit: 60,
    })
  );
  return new Error(interleave(strings, stringified));
}

/** internal error template */
function wrapInternalMsg(msg: string): string {
  return `internal error: ${msg}; if you encounter this please submit an issue at: https://github.com/erikbrinkman/d3-dag/issues`;
}

/** generic internal error */
export function ierr(
  strings: readonly string[],
  ...info: (string | number | bigint)[]
): Error {
  const stringified = map(info, (val) => val.toString());
  return new Error(wrapInternalMsg(interleave(strings, stringified)));
}

/** something with a name, e.g. a function */
export interface Named {
  /** the function name */
  name: string;
  /** an optional tag we use to identify builtin methods */
  d3dagBuiltin?: true;
}

/** customized error when we detect call back was internal */
export function berr(
  strings: readonly string[],
  named: Named,
  ...info: (string | number | bigint)[]
): Error {
  const [typ, ...rest] = strings;
  const stringified = map(info, (val) => val.toString());
  const msg = interleave(rest, stringified);
  const name = named.name || "anonymous";
  /* istanbul ignore next */
  return new Error(
    "d3dagBuiltin" in named
      ? wrapInternalMsg(`builtin ${typ}'${name}' ${msg.slice(1)}`)
      : `custom ${typ}'${name}'${msg}`
  );
}
