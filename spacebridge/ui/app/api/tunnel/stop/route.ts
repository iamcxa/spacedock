// spacebridge/ui/app/api/tunnel/stop/route.ts
// ABOUTME: POST handler — stops active tunnel via daemon RPC.

import { daemonRpc } from "@/lib/daemon-rpc";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const resp = await daemonRpc("tunnel_stop");
    if (resp.error) return Response.json({ error: resp.error }, { status: 500 });
    return Response.json(resp.result);
  } catch {
    return Response.json({ error: "daemon unreachable" }, { status: 502 });
  }
}
