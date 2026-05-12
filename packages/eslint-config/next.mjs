import nextPlugin from "@next/eslint-plugin-next";
import base from "./index.mjs";

/**
 * ESLint flat config for the Next.js apps: the shared base + `@next/eslint-plugin-next`
 * (recommended + core-web-vitals rules).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...base,
  {
    files: ["**/*.{ts,tsx,jsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];
