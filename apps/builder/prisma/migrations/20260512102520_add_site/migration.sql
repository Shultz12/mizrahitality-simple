-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL DEFAULT '{"blocks":[]}',
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Site_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_ownerId_key" ON "Site"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");
