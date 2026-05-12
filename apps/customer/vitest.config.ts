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
  // tsconfig sets `jsx: "preserve"` (Next handles it in the build); for the .test.tsx SSR-render
  // smoke tests, transform JSX here with the automatic runtime (`react/jsx-runtime`).
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
