// spacebridge/ui/app/api/entities/[slug]/chat/route.ts
// ABOUTME: POST handler for captain→FO chat messages. Validates slug + body,
// builds a send_captain_message command, forwards to daemon via socket RPC,
// returns {messageId, delivered} or 502 on daemon unreachable.

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

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).content !== "string" ||
    !(body as Record<string, unknown>).content
  ) {
    return Response.json({ error: "Body must include non-empty content string" }, { status: 400 });
  }

  const { content } = body as { content: string };
  const messageId = randomUUID();
  const sentAt = Date.now();
  const projectRoot = process.env.SPACEBRIDGE_PROJECT_ROOT ?? process.cwd();

  const command = {
    type: "send_captain_message",
    messageId,
    targetSessionId: "", // daemon resolves via projectRoot
    projectRoot,
    content,
    sentAt,
  };

  const socketPath = resolveSocketPath();

  try {
    const { createSocketClient } = await import("../../../../../../src/ipc/socket-client");

    const client = createSocketClient({
      socketPath,
      sessionId: `ui-route-${randomUUID()}`,
      projectRoot,
      pid: process.pid,
    });

    await client.connect();

    const resp = await client.request({
      id: randomUUID(),
      type: "rpc-request",
      payload: { method: "captain_chat", args: [command] },
    });

    client.close();

    const payload = resp.payload as { result?: { messageId: string; delivered: boolean }; error?: string };
    if (payload.error) {
      // Daemon returned an error (e.g., no active session) — still 200, delivered:false
      return Response.json({ messageId, delivered: false, reason: payload.error }, { status: 200 });
    }

    return Response.json(
      { messageId: payload.result?.messageId ?? messageId, delivered: payload.result?.delivered ?? false },
      { status: 200 },
    );
  } catch {
    return Response.json({ error: "daemon unreachable" }, { status: 502 });
  }
}
