"use client";

import { ThreadListItemPrimitive, ThreadListPrimitive } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

function ThreadListItem() {
  return (
    <ThreadListItemPrimitive.Root
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted/60",
        "data-[active=true]:bg-muted data-[active=true]:text-foreground"
      )}
    >
      <ThreadListItemPrimitive.Trigger className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 flex-1 truncate">
          <ThreadListItemPrimitive.Title fallback="Untitled" />
        </span>
      </ThreadListItemPrimitive.Trigger>
    </ThreadListItemPrimitive.Root>
  );
}

export function ThreadList() {
  return (
    <ThreadListPrimitive.Root className="flex flex-col gap-1">
      <ThreadListPrimitive.Items components={{ ThreadListItem }} />
    </ThreadListPrimitive.Root>
  );
}
