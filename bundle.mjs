import chalk from "chalk";
import { build } from "esbuild";
import ignorePlugin from "esbuild-plugin-ignore";
import { stat } from "node:fs/promises";
import { parse } from "node:path";
import { performance } from "perf_hooks";
import readPackageJson from "read-package-json";

const name = "d3-dag";
const start = performance.now();
const today = new Date();

async function wrapper(options) {
  const res = await build(options);
  const { outfile } = options;
  const { size } = await stat(outfile);
  const { dir, base } = parse(outfile);
  console.log(
    chalk.white(`\n  ${dir}/`) + chalk.bold(`${base}`),
    chalk.cyan(` ${(size / 1024).toFixed(1)}kb`)
  );
  return res;
}

// read package.json and dat to get info for preamble
const pkg = await new Promise((res, rej) =>
  readPackageJson("./package.json", (err, dat) => (err ? rej(err) : res(dat)))
);
const config = {
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.build.json",
  bundle: true,
  minify: true,
  plugins: [
    ignorePlugin([
      { resourceRegExp: /^fs$/ },
      { resourceRegExp: /^child_process$/ },
    ]),
  ],
  banner: {
    js: `// ${pkg.name} Version ${
      pkg.version
    }. Copyright ${today.getFullYear()} ${pkg.author.name}.`,
  },
};

await Promise.all([
  // build iife
  wrapper({
    ...config,
    platform: "browser",
    outfile: `bundle/${name}.iife.min.js`,
    // NOTE special commands to update d3
    globalName: "d3",
    banner: {
      js: `${config.banner.js}\nvar d3 = Object.assign(d3 || {}, (() => {`,
    },
    footer: {
      js: "return d3; })())",
    },
  }),
  // build cjs
  wrapper({
    ...config,
    platform: "node",
    outfile: `bundle/${name}.cjs.min.js`,
  }),
  // build esm
  wrapper({
    ...config,
    platform: "neutral",
    outfile: `bundle/${name}.esm.min.js`,
    mainFields: ["module", "main"],
  }),
]);

const elapsed = Math.round(performance.now() - start);
console.log("\n⚡", chalk.green(`Done in ${elapsed}ms`));
