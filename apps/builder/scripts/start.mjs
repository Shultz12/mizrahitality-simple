// Production launcher: starts `next start` on BUILDER_PORT (default 5111).
import { spawn } from "node:child_process";

const port = process.env.BUILDER_PORT ?? "5111";
const child = spawn("pnpm", ["exec", "next", "start", "-p", port], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
