import eslint from "@eslint/js";
import jest from "eslint-plugin-jest";
import spellcheck from "eslint-plugin-spellcheck";
import tsdoc from "eslint-plugin-tsdoc";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  //...tseslint.configs.stylisticTypeChecked,
  //...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      jest,
      spellcheck,
      tsdoc,
    },
    rules: {
      "no-console": "error",
      "tsdoc/syntax": "error",
      "prefer-const": [
        "error",
        {
          destructuring: "all",
        },
      ],
      "no-warning-comments": [
        "error",
        {
          terms: ["fixme"],
          location: "anywhere",
        },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_+$",
        },
      ],
      "spellcheck/spell-checker": [
        "error",
        {
          identifiers: false,
          skipWords: [
            "Awan",
            "Azura",
            "Emden",
            "Flowgen",
            "Flowtype",
            "Gansner",
            "Noam",
            "accessor",
            "accessors",
            "acyclic",
            "advisee",
            "aggregator",
            "aggregators",
            "bidirectionalizes",
            "bigrams",
            "bottomup",
            "coffman",
            "coffmangraham",
            "contravariant",
            "coord",
            "covariant",
            "curviness",
            "customizable",
            "decrement",
            "decross",
            "decrossed",
            "decrossing",
            "decrossings",
            "decycle",
            "dedup",
            "deserializing",
            "directionally",
            "ecode",
            "esnext",
            "grafo",
            "graphvis",
            "hydrator",
            "idescendants",
            "iife",
            "ilinks",
            "indeg",
            "infeasible",
            "initializers",
            "inits",
            "invariants",
            "iroots",
            "isplit",
            "iter",
            "iterables",
            "javascript",
            "lagrangian",
            "laidout",
            "longestpath",
            "minimizers",
            "multidag",
            "multigraph",
            "multimap",
            "multitree",
            "nchild",
            "nchildren",
            "negatable",
            "outdeg",
            "parametrize",
            "quadprog",
            "radix",
            "readonly",
            "rect",
            "replacer",
            "rescale",
            "rescaled",
            "resized",
            "resizing",
            "suboptimal",
            "sugi",
            "sugify",
            "sugiyama",
            "tabularesque",
            "topdown",
            "transpiled",
            "transpiling",
            "twolayer",
            "unordered",
            "unranked",
            "unsugify",
            "vals",
            "vert",
            "verticality",
            "zherebko",
          ],
          minLength: 4,
        },
      ],
    },
  },
);
