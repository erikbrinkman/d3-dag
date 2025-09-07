import { err } from "../utils";

/**
 * Verify an ID is a valid ID.
 */
export function verifyId(id: string): string {
  if (typeof id !== "string") {
    throw err`id is supposed to be type string but got type ${typeof id}`;
  }
  return id;
}

/**
 * an accessor for getting ids from node data
 *
 * The accessor must return an appropriate unique string id for given datum.
 * This operator will only be called once for each input.
 *
 * `index` will increment in the order data are processed.
 *
 * This is used in {@link Stratify#id}, {@link Connect#sourceId}, and
 * {@link Connect#targetId}.
 */
export type Id<in Datum = never> = (datum: Datum, index: number) => string;
