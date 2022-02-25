import { build } from "esbuild";
import ignorePlugin from "esbuild-plugin-ignore";
import { performance } from "perf_hooks";
import readPackageJson from "read-package-json";

const start = performance.now();

// read package.json and dat to get info for preamble
const pkg = await new Promise((res, rej) =>
  readPackageJson("./package.json", (err, dat) => (err ? rej(err) : res(dat)))
);
const today = new Date();
const baseConfig = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  plugins: [
    ignorePlugin([
      { resourceRegExp: /^fs$/ },
      { resourceRegExp: /^child_process$/ }
    ])
  ],
  banner: {
    js: `// ${pkg.name} Version ${
      pkg.version
    }. Copyright ${today.getFullYear()} ${pkg.author.name}.`
  }
};

await Promise.all([
  // build iife
  build({
    ...baseConfig,
    platform: "browser",
    format: "iife",
    outfile: "bundle/d3-dag.iife.min.js",
    define: { this: "window" },
    globalName: "d3",
    banner: {
      js: `${baseConfig.banner.js}\nvar d3 = Object.assign(d3 || {}, (() => {`
    },
    footer: {
      js: "return d3; })())"
    }
  }),
  // build cjs
  build({
    ...baseConfig,
    platform: "node",
    format: "cjs",
    outfile: "bundle/d3-dag.cjs.min.js",
    define: { this: "global" }
  }),
  // build esm
  build({
    ...baseConfig,
    platform: "neutral",
    format: "esm",
    outfile: "bundle/d3-dag.esm.min.js",
    mainFields: ["module", "main"],
    define: { this: "undefined" }
  })
]);

const end = performance.now();
console.log(`Done in ${(end - start).toFixed(2)}ms`);
