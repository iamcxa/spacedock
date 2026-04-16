// spacebridge/ui/app/api/daemon/status/route.ts
// ABOUTME: GET handler — returns daemon connection status for UI indicator.

import { daemonRpc } from "@/lib/daemon-rpc";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const resp = await daemonRpc("connection_status");
    if (resp.error) return Response.json({ error: resp.error }, { status: 500 });
    return Response.json(resp.result);
  } catch {
    return Response.json({ error: "daemon unreachable" }, { status: 502 });
  }
}
