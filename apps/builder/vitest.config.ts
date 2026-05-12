import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": here },
  },
  // Tests never import CSS; skip loading postcss.config.mjs / Tailwind during test runs.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.mjs"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
