// spacebridge/ui/app/api/entities/[slug]/gate/route.ts
// ABOUTME: POST handler for captain gate approve/reject decisions.
// Validates slug + body, builds a GateCommand, forwards to daemon via socket RPC,
// returns {decision, decidedAt} or 502 on daemon unreachable / GateAlreadyDecided.

import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

function resolveSocketPath(): string {
  const stateDir = process.env.SPACEBRIDGE_STATE_DIR ?? join(homedir(), ".spacedock");
  return join(stateDir, "spacebridge.sock");
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (
    typeof body !== "object" ||
    body === null ||
    (b.decision !== "approve" && b.decision !== "reject") ||
    typeof b.stage !== "string" ||
    !b.stage
  ) {
    return Response.json(
      { error: 'Body must include decision ("approve"|"reject") and stage string' },
      { status: 400 },
    );
  }

  const { decision, stage, reason } = b as { decision: "approve" | "reject"; stage: string; reason?: string };

  const command = {
    type: decision === "approve" ? "approve_gate" : "reject_gate",
    entitySlug: slug,
    stage,
    decidedBy: "captain",
    ...(reason ? { reason } : {}),
  };

  const socketPath = resolveSocketPath();

  try {
    const { createSocketClient } = await import("../../../../../../src/ipc/socket-client");

    // Use a sentinel projectRoot for the ephemeral UI client so it doesn't shadow
    // any real CC session in the daemon's sessionRegistry (O-2a most-recent-heartbeat wins).
    const client = createSocketClient({
      socketPath,
      sessionId: `ui-gate-${randomUUID()}`,
      projectRoot: `ui-ephemeral-gate-${randomUUID()}`,
      pid: process.pid,
    });

    await client.connect();

    const resp = await client.request({
      id: randomUUID(),
      type: "rpc-request",
      payload: { method: "gate_decide", args: [command] },
    });

    client.close();

    const payload = resp.payload as { result?: { decision: string; decidedAt: number }; error?: string };
    if (payload.error) {
      // GateAlreadyDecided or other daemon error — return 502 with verbatim error
      return Response.json({ error: payload.error }, { status: 502 });
    }

    return Response.json(
      { decision: payload.result?.decision, decidedAt: payload.result?.decidedAt },
      { status: 200 },
    );
  } catch {
    return Response.json({ error: "daemon unreachable" }, { status: 502 });
  }
}
