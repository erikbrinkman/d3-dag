"use strict";

import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json";
import replace from "@rollup/plugin-replace";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript2";

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.unpkg,
      format: "umd",
      name: "d3",
      extend: true,
      plugins: [terser()]
    },
    {
      file: pkg.main,
      format: "umd",
      name: "d3",
      extend: true
    },
    {
      file: pkg.module,
      format: "es"
    }
  ],
  plugins: [
    replace({
      // don't replace assignments
      preventAssignment: true,
      // FastPriorityQueue has this nasty line that breaks iife
      "require.main === module": false
    }),
    alias({
      // this is a hack, we replace fs and child process with "something else"
      // since we know they won't be called
      entries: {
        fs: "d3-array",
        child_process: "d3-array"
      }
    }),
    typescript(),
    resolve({ preferBuiltins: false }),
    commonjs()
  ]
};
