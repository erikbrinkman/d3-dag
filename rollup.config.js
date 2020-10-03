"use strict";

import builtins from "rollup-plugin-node-builtins";
import commonjs from "@rollup/plugin-commonjs";
import globals from "rollup-plugin-node-globals";
import replace from "@rollup/plugin-replace";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/d3-dag.min.js",
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
      // FastPriorityQueue has this nasty line that breaks iife
      "require.main === module": false
    }),
    typescript(),
    resolve(),
    commonjs(),
    globals(),
    builtins()
  ]
};
