"use client";

// The "Drag into site" tray: one draggable item per block type. Image and Book Now are
// singletons — once placed, their tray item is greyed (`aria-disabled` + dimmed) and no longer
// draggable, and the greyed Book Now item shows "Only one is allowed." on hover (the Image item
// gets the same hint for symmetry).

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon, MousePointerClick, Type } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BlockType } from "@/lib/site/types";

const TRAY_ITEMS: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "rich-text", label: "Rich Text", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "book-now", label: "Book Now button", icon: MousePointerClick },
];

export function BlockTray({ hasImage, hasBookNow }: { hasImage: boolean; hasBookNow: boolean }) {
  function isDisabled(type: BlockType): boolean {
    if (type === "image") return hasImage;
    if (type === "book-now") return hasBookNow;
    return false;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Drag into site</p>
      <div className="space-y-2">
        {TRAY_ITEMS.map((item) => {
          const disabled = isDisabled(item.type);
          const node = <TrayItem type={item.type} label={item.label} Icon={item.icon} disabled={disabled} />;
          if (!disabled) return <div key={item.type}>{node}</div>;
          return (
            <Tooltip key={item.type}>
              <TooltipTrigger asChild>{node}</TooltipTrigger>
              <TooltipContent>Only one is allowed.</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function TrayItem({
  type,
  label,
  Icon,
  disabled,
}: {
  type: BlockType;
  label: string;
  Icon: typeof Type;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `tray:${type}`,
    data: { source: "tray", blockType: type },
    disabled,
  });
  const dragProps = disabled ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      aria-disabled={disabled || undefined}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm select-none",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-grab hover:bg-accent active:cursor-grabbing",
      )}
      {...dragProps}
    >
      <GripVertical className="size-4 text-muted-foreground" />
      <Icon className="size-4" />
      <span>{label}</span>
    </div>
  );
}
