// spacebridge/ui/app/api/tunnel/status/route.ts
// ABOUTME: GET handler — returns tunnel status {active, url, provider}.

import { daemonRpc } from "@/lib/daemon-rpc";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const resp = await daemonRpc("tunnel_status");
    if (resp.error) return Response.json({ error: resp.error }, { status: 500 });
    return Response.json(resp.result);
  } catch {
    return Response.json({ error: "daemon unreachable" }, { status: 502 });
  }
}
