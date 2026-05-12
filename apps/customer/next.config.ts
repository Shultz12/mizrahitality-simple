import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared API-contract package is consumed as raw TypeScript source.
  transpilePackages: ["@mizrahitality/contracts"],
  // ESLint is run by the workspace `pnpm lint` script (flat config via @mizrahitality/eslint-config);
  // no need to re-run it during `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
