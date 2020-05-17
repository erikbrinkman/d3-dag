"use strict";
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import { terser } from 'rollup-plugin-terser';

export default {
  input: "src/index.ts",
  output: [
  {
    file: "dist/d3-dag.js",
    format: "umd",
    name: "d3",
    extend: true,
    globals: {"fs": "fs", "child_process": "child_process"}
  },
  {
    file: "dist/d3-dag.min.js",
    format: "umd",
    name: "d3",
    extend: true,
    globals: {"fs": "fs", "child_process": "child_process"},
    plugins: [terser()]
  },
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
  ],
  external: ["fs", "child_process"]
};
