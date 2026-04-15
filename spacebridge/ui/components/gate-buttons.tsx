"use client";
// spacebridge/ui/components/gate-buttons.tsx
// ABOUTME: Client Component — Approve / Reject buttons for gated entities (plan or uat stage).
// POSTs to /api/entities/[slug]/gate with decision + optional reject reason.
// Disables buttons while in-flight; shows result banner on success or error.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface GateButtonsProps {
  entitySlug: string;
  stage: string;
}

type Status = "idle" | "inflight" | "approved" | "rejected" | "error";

export function GateButtons({ entitySlug, stage }: GateButtonsProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function sendDecision(decision: "approve" | "reject") {
    setStatus("inflight");
    setErrorMsg(null);

    try {
      const resp = await fetch(`/api/entities/${entitySlug}/gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          stage,
          ...(decision === "reject" && reason ? { reason } : {}),
        }),
      });

      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(body.error ?? `HTTP ${resp.status}`);
        setStatus("error");
        return;
      }

      setStatus(decision === "approve" ? "approved" : "rejected");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus("error");
    }
  }

  if (status === "approved") {
    return (
      <div className="mt-4 p-3 rounded border border-green-200 bg-green-50 text-green-700 text-sm">
        Gate approved — FO will advance on next poll cycle.
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
        Gate rejected — FO will receive the rejection decision.
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Gate Decision — {stage}
      </h3>

      {status === "error" && (
        <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          Error: {errorMsg}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => sendDecision("approve")}
          disabled={status === "inflight"}
          variant="default"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {status === "inflight" ? "Saving…" : "Approve"}
        </Button>

        <Button
          onClick={() => setShowReason(!showReason)}
          disabled={status === "inflight"}
          variant="outline"
          size="sm"
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          Reject
        </Button>
      </div>

      {showReason && (
        <div className="space-y-2">
          <Textarea
            placeholder="Rejection reason (optional)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            disabled={status === "inflight"}
          />
          <Button
            onClick={() => sendDecision("reject")}
            disabled={status === "inflight"}
            variant="destructive"
            size="sm"
          >
            {status === "inflight" ? "Saving…" : "Confirm Reject"}
          </Button>
        </div>
      )}
    </div>
  );
}
