"use server";

// Server Actions backing the site builder (consistent with feature 2's `lib/auth/actions.ts` —
// the only mandated REST API is Builder↔Customer, GET /api/sites/{slug} being feature 5's). The
// validate/sanitize/persist logic lives in `./site` (`saveSite` / `publishSite`, DB-injectable so
// it's unit-tested without a database); these actions are thin wrappers — `requireOwner()`
// re-authenticates on every call and `redirect()` throws `NEXT_REDIRECT`, so it's never wrapped in
// try/catch. `createSiteAction` is a `useActionState` form action; `saveSiteAction` /
// `publishSiteAction` / `uploadImageAction` are called imperatively from the builder client.

import fs from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/lib/auth/current-owner";
import { prisma } from "@/lib/db";
import { createSite, publishSite, saveSite } from "./site";
import { UPLOADS_DIR } from "./uploads-dir";

export type { SaveResult } from "./site";

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

/**
 * Save the built page as a draft (stays un-live until Publish). Delegates to `saveSite`, which
 * re-checks ownership, re-validates the venue name, parses + validates + sanitizes the blocks, and
 * writes `name` + `contentJson` + `isDraft: true`.
 */
export async function saveSiteAction(
  siteId: string,
  payload: { name: string; blocks: unknown },
) {
  const owner = await requireOwner();
  const result = await saveSite(siteId, owner.id, payload);
  if (result.ok) revalidatePath("/builder");
  return result;
}

/**
 * Publish the built page: same validation/sanitization as Save, and additionally snapshots it into
 * `publishedJson` / `publishedAt` and sets `isDraft: false` — so `GET /api/sites/{slug}` serves it.
 */
export async function publishSiteAction(
  siteId: string,
  payload: { name: string; blocks: unknown },
) {
  const owner = await requireOwner();
  const result = await publishSite(siteId, owner.id, payload);
  if (result.ok) revalidatePath("/builder");
  return result;
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
