"use client";

// The single-page builder: a "Drag into site" tray, the canvas (pinned venue-name header that's
// edited in place + the ordered, sortable blocks), and a live preview — all wired with
// `@dnd-kit/core` + `@dnd-kit/sortable`. State is held client-side (`name`, `blocks`); "Save"
// posts it through `saveSiteAction` (a draft — un-live), "Publish" through `publishSiteAction`
// (snapshots it for `GET /api/sites/{slug}`). Both re-validate + sanitize server-side. The
// publish-state badge is optimistic client state (`everPublished` / `dirty`) seeded from the
// server props and re-synced on reload via `revalidatePath("/builder")`.

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { publishSiteAction, saveSiteAction } from "@/lib/site/actions";
import type { Block, BlockType, BuilderSite } from "@/lib/site/types";
import { cn } from "@/lib/utils";
import { BlockTray } from "./block-tray";
import { BlockView } from "./block-view";
import { SortableBlock } from "./sortable-block";

function newBlock(type: BlockType): Block {
  const id = crypto.randomUUID();
  switch (type) {
    case "rich-text":
      return { id, type: "rich-text", html: "<p></p>" };
    case "image":
      return { id, type: "image", imageUrl: "", alt: "" };
    case "book-now":
      return { id, type: "book-now" };
  }
}

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "published" }
  | { kind: "error"; message: string };

function publishBadge(everPublished: boolean, dirty: boolean): string {
  if (!everPublished) return "Not published yet";
  if (dirty) return "You have changes that aren’t live yet — Publish to update the page.";
  return "Published — the live page is up to date.";
}

export function SiteBuilder({ site }: { site: BuilderSite }) {
  const [name, setName] = useState(site.name);
  const [blocks, setBlocks] = useState<Block[]>(site.blocks);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [everPublished, setEverPublished] = useState(site.published);
  const [dirty, setDirty] = useState(site.hasUnpublishedChanges);
  const [pendingAction, setPendingAction] = useState<"save" | "publish" | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const hasImage = blocks.some((b) => b.type === "image");
  const hasBookNow = blocks.some((b) => b.type === "book-now");

  function touch() {
    setStatus({ kind: "idle" });
    setDirty(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const source = active.data.current?.source as string | undefined;

    if (source === "tray") {
      const blockType = active.data.current?.blockType as BlockType | undefined;
      if (!blockType) return;
      if ((blockType === "image" && hasImage) || (blockType === "book-now" && hasBookNow)) return;
      const created = newBlock(blockType);
      setBlocks((prev) => {
        if (over.id === "canvas") return [...prev, created];
        const index = prev.findIndex((b) => b.id === over.id);
        if (index === -1) return [...prev, created];
        return [...prev.slice(0, index), created, ...prev.slice(index)];
      });
      touch();
      return;
    }

    if (source === "block" && active.id !== over.id) {
      setBlocks((prev) => {
        const oldIndex = prev.findIndex((b) => b.id === active.id);
        const newIndex =
          over.id === "canvas" ? prev.length - 1 : prev.findIndex((b) => b.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      touch();
    }
  }

  function updateBlock(id: string, next: Block) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? next : b)));
    touch();
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    touch();
  }

  function save() {
    setPendingAction("save");
    startTransition(async () => {
      const result = await saveSiteAction(site.id, { name, blocks });
      if (result.ok) {
        setDirty(true); // a save keeps the draft un-live
        setStatus({ kind: "saved" });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
      setPendingAction(null);
    });
  }

  function publish() {
    setPendingAction("publish");
    startTransition(async () => {
      const result = await publishSiteAction(site.id, { name, blocks });
      if (result.ok) {
        setEverPublished(true);
        setDirty(false);
        setStatus({ kind: "published" });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
      setPendingAction(null);
    });
  }

  return (
    <TooltipProvider delayDuration={150}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <BlockTray hasImage={hasImage} hasBookNow={hasBookNow} />
          </aside>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-sm font-medium text-muted-foreground">Your page</h2>
                <p className="text-xs text-muted-foreground">{publishBadge(everPublished, dirty)}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Button type="button" variant="outline" onClick={save} disabled={pending}>
                  {pendingAction === "save" ? "Saving…" : "Save"}
                </Button>
                <Button type="button" onClick={publish} disabled={pending}>
                  {pendingAction === "publish" ? "Publishing…" : "Publish"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pinned header — the venue name (always shown; the web address stays fixed)
              </p>
              <input
                aria-label="Venue name (page header)"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  touch();
                }}
                className="mt-1 w-full bg-transparent text-2xl font-bold tracking-tight outline-none"
                placeholder="Your venue name"
              />
            </div>

            <Canvas blocks={blocks} onChangeBlock={updateBlock} onDeleteBlock={deleteBlock} />
          </div>

          <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <h2 className="text-sm font-medium text-muted-foreground">Live preview</h2>
            <Card>
              <CardContent className="pt-6">
                <BlockView name={name} blocks={blocks} />
              </CardContent>
            </Card>
          </div>
        </div>

        <SaveToast status={status} onDismiss={() => setStatus({ kind: "idle" })} />
      </DndContext>
    </TooltipProvider>
  );
}

function Canvas({
  blocks,
  onChangeBlock,
  onDeleteBlock,
}: {
  blocks: Block[];
  onChangeBlock: (id: string, next: Block) => void;
  onDeleteBlock: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-40 space-y-3 rounded-lg border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-accent/40" : "border-muted",
      )}
    >
      {blocks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Drag a block from the tray to start building.
        </p>
      ) : (
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              onChange={(next) => onChangeBlock(block.id, next)}
              onDelete={() => onDeleteBlock(block.id)}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

// Fixed bottom-right save/publish/error feedback. Auto-dismisses after ~2.5s for success states;
// errors persist until the user dismisses or another save/publish supersedes them.
const TOAST_AUTO_DISMISS_MS = 2500;

function SaveToast({ status, onDismiss }: { status: SaveStatus; onDismiss: () => void }) {
  useEffect(() => {
    if (status.kind !== "saved" && status.kind !== "published") return;
    const id = setTimeout(onDismiss, TOAST_AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [status, onDismiss]);

  if (status.kind === "idle") return null;

  const isError = status.kind === "error";
  const Icon = isError ? AlertTriangle : CheckCircle2;
  const title = isError
    ? "Couldn’t save"
    : status.kind === "published"
      ? "Published"
      : "Saved";
  const body = isError
    ? status.message
    : status.kind === "published"
      ? "Your live page is up to date."
      : "Changes saved successfully.";

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        role={isError ? "alert" : "status"}
        className="flex min-w-[320px] items-center gap-3 rounded-md border border-border bg-card p-4 shadow-lg"
      >
        <Icon
          className={cn("size-5 shrink-0", isError ? "text-destructive" : "text-success")}
          aria-hidden
        />
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{body}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
