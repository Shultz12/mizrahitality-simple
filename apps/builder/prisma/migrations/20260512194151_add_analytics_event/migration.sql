-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_slug_idx" ON "AnalyticsEvent"("slug");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_slug_type_idx" ON "AnalyticsEvent"("slug", "type");
