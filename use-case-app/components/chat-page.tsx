"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MenuIcon,
  PanelLeftIcon,
  LogOutIcon,
  MessageSquareIcon,
} from "lucide-react";
import { HsafaProvider, useHsafaClient, type SmartSpace } from "@hsafa/react-sdk";
import { HsafaChatProvider } from "@hsafa/ui";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { AuthSession } from "@/components/register-form";

const GATEWAY_URL = process.env.NEXT_PUBLIC_HSAFA_GATEWAY_URL || "http://localhost:3001";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_HSAFA_PUBLIC_KEY || "";

interface ChatPageProps {
  session: AuthSession;
  onLogout: () => void;
}

export function ChatPage({ session, onLogout }: ChatPageProps) {
  return (
    <HsafaProvider
      gatewayUrl={GATEWAY_URL}
      publicKey={PUBLIC_KEY}
      jwt={session.token}
    >
      <ChatPageInner session={session} onLogout={onLogout} />
    </HsafaProvider>
  );
}

function ChatPageInner({
  session,
  onLogout,
}: ChatPageProps) {
  const client = useHsafaClient();

  // Read initial space from URL, fall back to session default
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(() => {
    if (typeof window === "undefined") return session.user.smartSpaceId;
    const params = new URLSearchParams(window.location.search);
    return params.get("space") || session.user.smartSpaceId;
  });

  // Keep URL in sync with selected space
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("space", selectedSpaceId);
    window.history.replaceState({}, "", url.toString());
  }, [selectedSpaceId]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [spaces, setSpaces] = useState([
    {
      id: session.user.smartSpaceId,
      name: `${session.user.name}'s Chat`,
    },
  ]);

  // Fetch all spaces the user is a member of (works with public key + JWT)
  useEffect(() => {
    client.spaces.list().then(({ smartSpaces }) => {
      if (smartSpaces && smartSpaces.length > 0) {
        setSpaces(smartSpaces.map((s: any) => ({ id: s.id, name: s.name || "Untitled" })));
      }
    }).catch((err) => {
      console.error("Failed to list spaces (auth or network issue?):", err);
    });
  }, [client]);

  const handleSwitchSpace = useCallback((spaceId: string) => {
    setSelectedSpaceId(spaceId);
  }, []);

  // Create new space via server-side API route (requires secret key)
  const handleNewThread = useCallback(async () => {
    try {
      const res = await fetch("/api/spaces/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          name: `Chat ${new Date().toLocaleTimeString()}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create space");
      }

      const { smartSpace } = await res.json();

      setSelectedSpaceId(smartSpace.id);

      // Re-fetch full spaces list from gateway to stay in sync
      client.spaces.list().then(({ smartSpaces }) => {
        if (smartSpaces && smartSpaces.length > 0) {
          setSpaces(smartSpaces.map((s: any) => ({ id: s.id, name: s.name || "Untitled" })));
        }
      }).catch((err) => {
        console.error("Failed to refresh spaces list:", err);
        // Fallback: append locally
        setSpaces((prev) => [
          ...prev,
          { id: smartSpace.id, name: smartSpace.name || "Untitled" },
        ]);
      });
    } catch (err) {
      console.error("Failed to create new space:", err);
    }
  }, [client, session.token]);

  return (
    <HsafaChatProvider
      gatewayUrl={GATEWAY_URL}
      publicKey={PUBLIC_KEY}
      jwt={session.token}
      entityId={session.user.entityId}
      smartSpaceId={selectedSpaceId}
      smartSpaces={spaces.map((s) => ({ id: s.id, name: s.name }) as SmartSpace)}
      onSwitchThread={handleSwitchSpace}
      onNewThread={handleNewThread}
    >
      <div className="flex h-dvh w-full bg-background">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden md:flex h-full flex-col border-r border-border bg-muted/30 transition-all duration-200",
            sidebarCollapsed
              ? "md:w-0 overflow-hidden opacity-0"
              : "md:w-[260px] opacity-100"
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquareIcon className="size-4 text-primary" />
              <span className="text-foreground/90">Hsafa</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <ThreadList />
          </div>
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {session.user.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {session.user.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="size-7"
                title="Logout"
              >
                <LogOutIcon className="size-3" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex size-9"
            >
              {sidebarCollapsed ? (
                <MenuIcon className="size-4" />
              ) : (
                <PanelLeftIcon className="size-4" />
              )}
            </Button>

            <span className="flex-1 text-sm font-medium text-muted-foreground">
              AI Assistant
            </span>

            <ThemeToggle />

            {/* Mobile logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="md:hidden size-9"
              title="Logout"
            >
              <LogOutIcon className="size-4" />
            </Button>
          </header>

          {/* Chat Area */}
          <main className="flex-1 overflow-hidden">
            <Thread />
          </main>
        </div>
      </div>
    </HsafaChatProvider>
  );
}
