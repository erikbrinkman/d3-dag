import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";

export default {
  input: "index.js",
  output: {
    file: "dist/d3-dag.js",
    format: "umd",
    name: "d3",
    extend: true,
  },
  plugins: [
    resolve(),
    commonjs(),
  ],
};
