"use strict";

import builtins from "rollup-plugin-node-builtins";
import commonjs from "@rollup/plugin-commonjs";
import globals from "rollup-plugin-node-globals";
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
      // FastPriorityQueue has this nasty line that breaks iife
      "require.main === module": false
    }),
    typescript(),
    builtins(),
    resolve(),
    commonjs(),
    globals()
  ]
};
