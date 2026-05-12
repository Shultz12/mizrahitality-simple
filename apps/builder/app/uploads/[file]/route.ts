// GET /uploads/<file> — serves owner-uploaded images from the gitignored `apps/builder/uploads/`
// directory (writes happen in `lib/site/actions.ts`'s `uploadImageAction`). The only route
// handler this feature adds; no auth (it's an asset route, and the uuid filenames aren't
// enumerable). Stock images live under `public/stock/` and are served by Next's static handler.

import fs from "node:fs/promises";
import path from "node:path";

import { UPLOADS_DIR } from "@/lib/site/uploads-dir";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;

  // Reject anything that could escape the uploads directory.
  if (!file || /[\\/]/.test(file) || file.includes("..") || file.includes("\0")) return notFound();

  const full = path.join(UPLOADS_DIR, file);
  const base = path.resolve(UPLOADS_DIR);
  if (!path.resolve(full).startsWith(base + path.sep)) return notFound();

  let data: Buffer;
  try {
    data = await fs.readFile(full);
  } catch {
    return notFound();
  }

  const ext = path.extname(file).slice(1).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
