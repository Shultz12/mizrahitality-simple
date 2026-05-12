// Demo seed (feature 9 — demo-seed). Plain `node`-runnable ESM: `pnpm seed` → `pnpm -F builder
// seed` → `node prisma/seed.mjs`. `@prisma/client` auto-loads `apps/builder/.env` (the generated
// client carries `schemaEnvPath`), so no dotenv wiring — first-time setup (`cp .env.example .env`
// then `pnpm db:migrate`) is the documented prerequisite.
//
// Re-runnable via a *scoped* reset: it deletes only the demo owner / site / events (keyed by the
// demo email + slug), then recreates them — any other dev data is left intact. The pure demo
// content lives in `./seed-content.mjs` (shared with the DB-free vitest test).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  DEMO_CONTENT_JSON,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_PUBLISHED_JSON,
  DEMO_SLUG,
  DEMO_VENUE_NAME,
  demoEvents,
} from "./seed-content.mjs";

// Builder ports / URLs for the summary printout (kept in step with CLAUDE.md / scripts/dev.mjs).
const BUILDER_URL = `http://localhost:${process.env.BUILDER_PORT ?? 5113}`;
const CUSTOMER_URL = `http://localhost:${process.env.CUSTOMER_PORT ?? 5114}`;

const prisma = new PrismaClient();

async function main() {
  // Scoped reset — order: events first (no FK on AnalyticsEvent.slug), then the site, then the
  // owner (OwnerAccount → Site cascades, but be explicit). `deleteMany` never throws on no match.
  await prisma.analyticsEvent.deleteMany({ where: { slug: DEMO_SLUG } });
  await prisma.site.deleteMany({ where: { slug: DEMO_SLUG } });
  await prisma.ownerAccount.deleteMany({ where: { email: DEMO_EMAIL } });

  // bcrypt cost 12 — keep in sync with SALT_ROUNDS in lib/auth/password.ts. (Drift is cosmetic:
  // bcrypt.compare reads the cost from the stored hash, so sign-in works regardless.)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const owner = await prisma.ownerAccount.create({ data: { email: DEMO_EMAIL, passwordHash } });

  await prisma.site.create({
    data: {
      ownerId: owner.id,
      name: DEMO_VENUE_NAME,
      slug: DEMO_SLUG,
      contentJson: DEMO_CONTENT_JSON,
      isDraft: false,
      publishedJson: DEMO_PUBLISHED_JSON,
      publishedAt: new Date(),
    },
  });

  const events = demoEvents();
  await prisma.analyticsEvent.createMany({ data: events });

  console.log(
    [
      "seed: demo site ready.",
      `  owner:     ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
      `  venue:     ${DEMO_VENUE_NAME}  (slug: ${DEMO_SLUG})`,
      `  events:    ${events.length} sample analytics rows`,
      `  builder:   ${BUILDER_URL}/sign-in  →  ${BUILDER_URL}/dashboard  ·  ${BUILDER_URL}/builder`,
      `  public:    ${CUSTOMER_URL}/${DEMO_SLUG}`,
      `  api:       ${BUILDER_URL}/api/sites/${DEMO_SLUG}`,
    ].join("\n"),
  );
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
