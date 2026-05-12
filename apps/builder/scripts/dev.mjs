// Dev launcher: starts `next dev` on BUILDER_PORT (default 5113).
import { spawn } from "node:child_process";

const port = process.env.BUILDER_PORT ?? "5113";
const child = spawn("pnpm", ["exec", "next", "dev", "-p", port], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
