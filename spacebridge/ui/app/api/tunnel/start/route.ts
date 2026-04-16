// spacebridge/ui/app/api/tunnel/start/route.ts
// ABOUTME: POST handler — starts tunnel via daemon RPC, returns {url, provider}.

import { daemonRpc } from "@/lib/daemon-rpc";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let backend: string | undefined;
  try {
    const body = await req.json();
    backend = (body as { backend?: string }).backend;
  } catch {
    // no body is fine — use auto-detect
  }

  try {
    const resp = await daemonRpc("tunnel_start", backend ? [backend] : []);
    if (resp.error) return Response.json({ error: resp.error }, { status: 500 });
    return Response.json(resp.result);
  } catch {
    return Response.json({ error: "daemon unreachable" }, { status: 502 });
  }
}
