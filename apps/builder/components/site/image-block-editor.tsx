"use client";

// Editor for the placed Image block: pick from the committed stock set or upload a file
// (`uploadImageAction` → `/uploads/<uuid>.<ext>`), plus an editable alt-text field. `imageUrl`
// stays a relative path; the parent threads the updated block into state so the live preview
// reflects the pick immediately.

import { type ChangeEvent, useState, useTransition } from "react";
import { ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { uploadImageAction } from "@/lib/site/actions";
import { STOCK_IMAGES } from "@/lib/stock";
import type { ImageBlock } from "@/lib/site/types";

export function ImageBlockEditor({
  block,
  onChange,
}: {
  block: ImageBlock;
  onChange: (next: ImageBlock) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pickStock(src: string, label: string) {
    onChange({ ...block, imageUrl: src, alt: block.alt || label });
    setError(null);
    setOpen(false);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    setError(null);
    startTransition(async () => {
      const result = await uploadImageAction(formData);
      if (result.ok) {
        onChange({ ...block, imageUrl: result.url });
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {block.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.imageUrl}
            alt={block.alt}
            className="h-20 w-32 rounded-md border object-cover"
          />
        ) : (
          <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            No image
          </div>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <ImageIcon className="size-4" /> {block.imageUrl ? "Change image" : "Choose image"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose an image</DialogTitle>
              <DialogDescription>Pick one of ours or upload your own.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Stock images</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STOCK_IMAGES.map((stock) => (
                    <button
                      key={stock.id}
                      type="button"
                      onClick={() => pickStock(stock.src, stock.label)}
                      className="overflow-hidden rounded-md border hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={stock.src} alt={stock.label} className="aspect-video w-full object-cover" />
                      <span className="block px-1 py-0.5 text-center text-xs">{stock.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor={`upload-${block.id}`}>Upload an image</Label>
                <Input
                  id={`upload-${block.id}`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleUpload}
                  disabled={pending}
                />
                {pending ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
                {error ? (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`alt-${block.id}`}>Image description (for accessibility)</Label>
        <Input
          id={`alt-${block.id}`}
          value={block.alt}
          onChange={(event) => onChange({ ...block, alt: event.target.value })}
          placeholder="e.g. Our cozy dining room"
        />
      </div>
    </div>
  );
}
