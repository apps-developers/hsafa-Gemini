"use client";

import { useState } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { MenuIcon, PanelLeftIcon } from "lucide-react";
import { useHsafaClient, useSmartSpaces } from "@hsafa/react-sdk";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useHsafaRuntime } from "@/hooks/useHsafaRuntime";
import { cn } from "@/lib/utils";

const GATEWAY_URL = "http://localhost:3001";
const DEMO_USER_ENTITY_ID = "b04623f4-4c18-43cc-8010-0f18d05b5004";

function Logo() {
  return (
    <div className="flex items-center gap-2 px-2 font-medium text-sm">
      <span className="text-lg">🤖</span>
      <span className="text-foreground/90">hsafa</span>
    </div>
  );
}

function DesktopSidebar({ collapsed }: { collapsed?: boolean }) {
  return (
    <aside
      className={cn(
        "hidden md:flex h-full flex-col bg-muted/30 transition-all duration-200",
        collapsed ? "md:w-0 overflow-hidden opacity-0" : "md:w-[260px] opacity-100"
      )}
    >
      <div className="flex h-14 shrink-0 items-center px-4">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ThreadList />
      </div>
    </aside>
  );
}

function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="flex h-14 shrink-0 items-center px-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <ThreadList />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Header({
  sidebarCollapsed,
  onToggleSidebar,
  onMobileMenuOpen,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onMobileMenuOpen: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMobileMenuOpen}
        className="size-9 md:hidden"
      >
        <MenuIcon className="size-4" />
      </Button>

      {/* Desktop sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="hidden md:flex size-9"
      >
        {sidebarCollapsed ? (
          <MenuIcon className="size-4" />
        ) : (
          <PanelLeftIcon className="size-4" />
        )}
      </Button>

      <span className="flex-1 text-sm font-medium text-muted-foreground">
        Hsafa Agent Test
      </span>

      <ThemeToggle />
    </header>
  );
}

export default function Home() {
  const client = useHsafaClient({ gatewayUrl: GATEWAY_URL });
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { smartSpaces, refresh } = useSmartSpaces(client, {
    entityId: DEMO_USER_ENTITY_ID,
  });
  const effectiveSmartSpaceId = selectedSpaceId ?? smartSpaces[0]?.id ?? null;

  const { runtime } = useHsafaRuntime({
    client,
    entityId: DEMO_USER_ENTITY_ID,
    smartSpaceId: effectiveSmartSpaceId,
    smartSpaces,
    onSwitchThread: setSelectedSpaceId,
    onNewThread: async () => {
      const created = await client.createSmartSpace({
        name: `Chat ${new Date().toLocaleString()}`,
        isPrivate: true,
      });
      await client.addSmartSpaceMember({
        smartSpaceId: created.id,
        entityId: DEMO_USER_ENTITY_ID,
        role: "member",
      });
      await refresh();
      setSelectedSpaceId(created.id);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full w-full bg-background">
        <DesktopSidebar collapsed={sidebarCollapsed} />
        <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onMobileMenuOpen={() => setMobileMenuOpen(true)}
          />
          <main className="flex-1 overflow-hidden">
            <Thread />
          </main>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
