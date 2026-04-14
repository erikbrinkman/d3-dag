import * as d3dag from "../src/index";

const globals = globalThis as typeof globalThis & {
  d3?: Record<string, unknown>;
};
globals.d3 = Object.assign(globals.d3 ?? {}, d3dag);
