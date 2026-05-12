import { PrismaClient } from "@prisma/client";

// One PrismaClient per process; cached on globalThis so Next.js dev hot-reload doesn't
// open a new connection on every change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
