"use client";

// The live metric tiles on the owner dashboard. Server-rendered for the first paint from
// `initialSummary` (the in-process aggregation), then polled every 10s against the same-origin
// `GET /api/sites/{slug}/analytics` so the numbers tick up as events arrive — no manual reload, no
// realtime infra. A failed/aborted poll is swallowed (keep the last good numbers); the interval is
// cleared on unmount and late results are ignored via a `cancelled` flag.

import { useEffect, useState } from "react";
import { Eye, MousePointer2, MousePointerClick, type LucideIcon } from "lucide-react";

import { analyticsSummaryPath, type AnalyticsSummary } from "@mizrahitality/contracts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { metricTiles, type MetricTile } from "@/lib/analytics/dashboard-view";

const POLL_MS = 10_000;

const TILE_ICONS: Record<MetricTile["key"], LucideIcon> = {
  visits: Eye,
  bookNowHovers: MousePointer2,
  bookNowClicks: MousePointerClick,
};

export function AnalyticsMetrics({
  slug,
  initialSummary,
}: {
  slug: string;
  initialSummary: AnalyticsSummary;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(analyticsSummaryPath(slug), { cache: "no-store" });
        const body = (await res.json()) as { ok?: boolean; data?: AnalyticsSummary };
        if (!cancelled && body.ok && body.data) {
          setSummary(body.data);
          setUpdatedAt(new Date().toLocaleTimeString());
        }
      } catch {
        /* keep the last good numbers */
      }
    }
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [slug]);

  const tiles = metricTiles(summary);

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = TILE_ICONS[tile.key];
          return (
            <Card key={tile.key}>
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5">
                  <Icon className="size-4" aria-hidden="true" />
                  {tile.label}
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">{tile.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{tile.hint}</CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Updates automatically{updatedAt ? ` — last refreshed ${updatedAt}` : ""}.
      </p>
    </div>
  );
}
