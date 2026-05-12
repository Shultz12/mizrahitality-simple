import next from "@mizrahitality/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
const config = [...next, { ignores: [".next/**", "node_modules/**"] }];

export default config;
