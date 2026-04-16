"use client";
// spacebridge/ui/components/tunnel-button.tsx
// ABOUTME: Header widget for tunnel management. Shows status (off/starting/active),
// start/stop toggle, copy-URL button. Polls /api/tunnel/status on mount.

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type TunnelState = "off" | "starting" | "active" | "stopping";

interface TunnelStatus {
  active: boolean;
  url: string | null;
  provider: string | null;
}

export function TunnelButton() {
  const [state, setState] = useState<TunnelState>("off");
  const [url, setUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/tunnel/status");
      if (!res.ok) return;
      const data = (await res.json()) as TunnelStatus;
      if (data.active && data.url) {
        setState("active");
        setUrl(data.url);
        setProvider(data.provider);
      } else {
        setState("off");
        setUrl(null);
        setProvider(null);
      }
    } catch {
      // daemon unreachable — stay in current state
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleToggle() {
    if (state === "active") {
      setState("stopping");
      try {
        await fetch("/api/tunnel/stop", { method: "POST" });
        setState("off");
        setUrl(null);
        setProvider(null);
      } catch {
        await fetchStatus();
      }
    } else if (state === "off") {
      setState("starting");
      try {
        const res = await fetch("/api/tunnel/start", { method: "POST" });
        if (res.ok) {
          const data = (await res.json()) as { url: string; provider: string };
          setState("active");
          setUrl(data.url);
          setProvider(data.provider);
        } else {
          setState("off");
        }
      } catch {
        setState("off");
      }
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant={state === "active" ? "default" : "outline"}
        className="h-7 text-xs gap-1.5"
        onClick={handleToggle}
        disabled={state === "starting" || state === "stopping"}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            state === "active"
              ? "bg-green-400"
              : state === "starting" || state === "stopping"
                ? "bg-yellow-400 animate-pulse"
                : "bg-muted-foreground/40"
          }`}
        />
        {state === "active" && provider
          ? `${provider}`
          : state === "starting"
            ? "Starting..."
            : state === "stopping"
              ? "Stopping..."
              : "Tunnel"}
      </Button>

      {state === "active" && url && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs px-2"
          onClick={handleCopy}
          title={url}
        >
          {copied ? "Copied!" : "Copy URL"}
        </Button>
      )}
    </div>
  );
}
