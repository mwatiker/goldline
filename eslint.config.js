import js from "@eslint/js";
import globals from "globals";

export default [
  {ignores: ["dist/", "node_modules/"]},
  js.configs.recommended,
  {
    files: ["extension/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {...globals.browser, ...globals.webextensions},
    },
  },
  {
    files: ["extension/background.js", "extension/content.js"],
    languageOptions: {sourceType: "script"},
  },
  {
    files: ["eslint.config.js"],
    languageOptions: {globals: globals.node},
  },
];
