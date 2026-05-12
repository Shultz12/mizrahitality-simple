// Production launcher: starts `next start` on CUSTOMER_PORT (default 5114).
import { spawn } from "node:child_process";

const port = process.env.CUSTOMER_PORT ?? "5114";
const child = spawn("pnpm", ["exec", "next", "start", "-p", port], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
