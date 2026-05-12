// Dev launcher: starts `next dev` on CUSTOMER_PORT (default 5112).
import { spawn } from "node:child_process";

const port = process.env.CUSTOMER_PORT ?? "5112";
const child = spawn("pnpm", ["exec", "next", "dev", "-p", port], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
