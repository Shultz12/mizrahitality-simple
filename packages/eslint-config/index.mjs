import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

/**
 * Base flat ESLint config shared across the monorepo.
 *
 * - JS recommended rules everywhere.
 * - TypeScript recommended rules (with the `@typescript-eslint` parser) scoped to `.ts(x)`
 *   so plain `.mjs`/`.cjs` config & script files aren't TS-parsed.
 * - `@typescript-eslint/no-explicit-any` is an error; unused vars are warnings (underscore-prefixed ignored).
 * - Prettier last to disable any stylistic conflicts.
 */
export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/next-env.d.ts",
    ],
  },
  { files: ["**/*.{js,mjs,cjs,ts,tsx,mts,cts}"], extends: [js.configs.recommended] },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { sourceType: "module", globals: { ...globals.node } },
  },
  prettier,
);
