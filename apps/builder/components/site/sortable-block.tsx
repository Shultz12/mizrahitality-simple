"use client";

// A placed block in the builder canvas: a `useSortable` wrapper (drag handle to reorder, trash
// button to delete) around the type-specific editor.

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Block } from "@/lib/site/types";
import { BookNowBlock } from "./book-now-block";
import { ImageBlockEditor } from "./image-block-editor";
import { RichTextEditor } from "./rich-text-editor";

const BLOCK_LABELS: Record<Block["type"], string> = {
  "rich-text": "Rich Text",
  image: "Image",
  "book-now": "Book Now button",
};

export function SortableBlock({
  block,
  onChange,
  onDelete,
}: {
  block: Block;
  onChange: (next: Block) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { source: "block" },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            className="-m-1 cursor-grab touch-none rounded p-1 hover:bg-accent active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          {BLOCK_LABELS[block.type]}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label="Delete block"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <BlockEditor block={block} onChange={onChange} />
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (next: Block) => void }) {
  switch (block.type) {
    case "rich-text":
      return <RichTextEditor html={block.html} onChange={(html) => onChange({ ...block, html })} />;
    case "image":
      return <ImageBlockEditor block={block} onChange={onChange} />;
    case "book-now":
      return <BookNowBlock />;
  }
}
