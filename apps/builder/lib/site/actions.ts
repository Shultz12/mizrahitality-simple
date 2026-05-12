"use server";

// Server Actions backing the site builder (consistent with feature 2's `lib/auth/actions.ts` —
// the only mandated REST API is Builder↔Customer, which is features 5/6). `createSiteAction` is a
// `useActionState` form action; `saveSiteAction` / `uploadImageAction` are called imperatively
// from the builder client (inside a `useTransition`). `requireOwner()` re-authenticates on every
// call and `redirect()` throws `NEXT_REDIRECT`, so it's never wrapped in try/catch.

import fs from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/lib/auth/current-owner";
import { prisma } from "@/lib/db";
import { parsePageContent, validateBlocks } from "./content";
import { sanitizeRichTextHtml } from "./sanitize";
import { createSite } from "./site";
import { validateVenueName } from "./slug";
import { UPLOADS_DIR } from "./uploads-dir";

/** `useActionState` state for the create-site form — `null` until a submit fails. */
export type CreateSiteState = { error: string; field?: "venueName" } | null;

export async function createSiteAction(
  _prev: CreateSiteState,
  formData: FormData,
): Promise<CreateSiteState> {
  const owner = await requireOwner();

  const existing = await prisma.site.findUnique({
    where: { ownerId: owner.id },
    select: { id: true },
  });
  if (existing) return { error: "You already have a site." };

  const result = await createSite({ ownerId: owner.id, name: formData.get("venueName") });
  if (!result.ok) return { error: result.error, field: "venueName" };

  revalidatePath("/builder");
  redirect("/builder");
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Persist the built page. Re-checks ownership server-side (never trusts the client `siteId`),
 * re-validates the venue name (the pinned header reuses the rule — the slug stays untouched),
 * parses + validates + sanitizes the blocks, then writes `name` + `contentJson`. Publish is
 * feature 5 — every save keeps `isDraft` as is.
 */
export async function saveSiteAction(
  siteId: string,
  payload: { name: string; blocks: unknown },
): Promise<SaveResult> {
  const owner = await requireOwner();

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.ownerId !== owner.id) return { ok: false, error: "Site not found." };

  const name = validateVenueName(payload.name);
  if (!name.ok) return { ok: false, error: name.error };

  const rawBlocks = payload.blocks;
  const parsed = parsePageContent(Array.isArray(rawBlocks) ? { blocks: rawBlocks } : rawBlocks);
  const validated = validateBlocks(parsed.blocks);
  if (!validated.ok) return { ok: false, error: validated.error };

  const blocks = validated.blocks.map((b) =>
    b.type === "rich-text" ? { ...b, html: sanitizeRichTextHtml(b.html) } : b,
  );

  await prisma.site.update({
    where: { id: site.id },
    data: { name: name.value, contentJson: JSON.stringify({ blocks }) },
  });
  revalidatePath("/builder");
  return { ok: true };
}

const ALLOWED_IMAGE_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/** Store an owner-uploaded image under `apps/builder/uploads/` and return its `/uploads/<file>` URL. */
export async function uploadImageAction(formData: FormData): Promise<UploadResult> {
  await requireOwner();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No image was provided." };

  const ext = ALLOWED_IMAGE_MIME[file.type as keyof typeof ALLOWED_IMAGE_MIME];
  if (!ext) return { ok: false, error: "Use a PNG, JPEG, WebP or GIF image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Image must be 5 MB or smaller." };

  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true, url: `/uploads/${name}` };
}
