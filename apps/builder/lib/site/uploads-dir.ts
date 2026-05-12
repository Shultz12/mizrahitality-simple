import path from "node:path";

/**
 * On-disk location of owner-uploaded images — the gitignored `apps/builder/uploads/` directory,
 * served by the `GET /uploads/<file>` route handler. Assumes the Builder process runs with
 * `apps/builder` as its cwd (true for `pnpm -F builder dev` / `scripts/dev.mjs` / `next
 * build|start`). Kept in one place so the path is easy to harden later.
 */
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
