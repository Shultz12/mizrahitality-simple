"use client";

// The live metric tiles on the owner dashboard. Server-rendered for the first paint from
// `initialSummary` (the in-process aggregation), then polled every 10s against the same-origin
// `GET /api/sites/{slug}/analytics` so the numbers tick up as events arrive — no manual reload, no
// realtime infra. A failed/aborted poll is swallowed (keep the last good numbers); the interval is
// cleared on unmount and late results are ignored via a `cancelled` flag.

import { useEffect, useState } from "react";
import { Eye, MousePointer2, MousePointerClick, type LucideIcon } from "lucide-react";

import { analyticsSummaryPath, type AnalyticsSummary } from "@mizrahitality/contracts";

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = TILE_ICONS[tile.key];
          return (
            <div
              key={tile.key}
              className="flex min-h-[160px] flex-col justify-between rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-muted-foreground">{tile.label}</span>
                <Icon className="size-5 text-foreground" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-semibold tracking-tight tabular-nums">
                  {tile.value}
                </div>
                <div className="text-xs text-muted-foreground">{tile.hint}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Updates automatically{updatedAt ? ` — last refreshed ${updatedAt}` : ""}.
      </p>
    </div>
  );
}
