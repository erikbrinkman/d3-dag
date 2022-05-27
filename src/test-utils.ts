import { err } from "./utils";

/** assert something */
export function assert(statement: unknown): asserts statement {
  if (!statement) {
    throw err`failed assert`;
  }
}
