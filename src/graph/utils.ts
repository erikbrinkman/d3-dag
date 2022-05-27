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
 * The interface for getting a node id from data. The function must return an
 * appropriate unique string id for given datum. This operator will only be
 * called once for each input.
 *
 * `i` will increment in the order data are processed.
 *
 * This is used in {@link graph/stratify!Stratify#id},
 * {@link graph/connect!Connect#sourceId}, and
 * {@link graph/connect!Connect#targetId}.
 */
export interface IdOperator<in Datum = never> {
  (d: Datum, i: number): string;
}
