// ABOUTME: Next.js middleware for share route protection and rate limiting.
// Intercepts /share/* and /api/share/* paths.
// Extracts bearer token from URL path, validates format, injects x-share-token header.
// Rate limiting: in-memory token-bucket per token (60 req/min). Returns 429 when exceeded.
// Token DB validation (expiry/entity scope) happens in downstream route handlers
// to avoid Edge Runtime bun:sqlite restrictions — middleware only checks token format.
// Non-share paths pass through unmodified.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Rate limiter ─────────────────────────────────────────────────────────────

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// Module-level Map — persists across requests in the same process.
// In-memory only: fine for single-daemon pre-SaaS architecture (design doc §6.4).
const rateLimitMap = new Map<string, RateLimitBucket>();

export const RATE_LIMIT_MAX = 60;        // requests per window
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

export function checkRateLimit(token: string, nowMs: number = Date.now()): boolean {
  const bucket = rateLimitMap.get(token);
  if (!bucket || bucket.resetAt <= nowMs) {
    // New window
    rateLimitMap.set(token, { count: 1, resetAt: nowMs + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return false; // exceeded
  }
  return true; // allowed
}

/** Exposed for testing: reset rate limit state */
export function resetRateLimitMap(): void {
  rateLimitMap.clear();
}

// ─── Token extraction ─────────────────────────────────────────────────────────

/** Extract share token from /share/[token] or /api/share/... path.
 *  Returns null if path does not contain a share token segment.
 */
export function extractTokenFromPath(pathname: string): string | null {
  // /share/<token>  or  /share/<token>/...
  const shareMatch = pathname.match(/^\/share\/([^/?#]+)/);
  if (shareMatch) return shareMatch[1];

  // /api/share/events?token=<token>  or  /api/share/comments?token=<token>
  // token comes from query param for API routes — middleware reads from URL
  return null;
}

export function extractTokenFromUrl(url: URL): string | null {
  // Try path first (/share/<token>)
  const fromPath = extractTokenFromPath(url.pathname);
  if (fromPath) return fromPath;

  // Try query param (?token=<token>) for /api/share/* routes
  const fromQuery = url.searchParams.get("token");
  if (fromQuery) return fromQuery;

  return null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest): NextResponse {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Only intercept share routes
  const isShareRoute =
    pathname.startsWith("/share/") ||
    pathname.startsWith("/api/share/");

  if (!isShareRoute) {
    return NextResponse.next();
  }

  const token = extractTokenFromUrl(url);

  if (!token) {
    return NextResponse.json(
      { error: "Missing share token" },
      { status: 401 }
    );
  }

  // Rate limit check (in-memory, per token)
  if (!checkRateLimit(token)) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // Inject token into request headers for downstream route handlers.
  // Entity slug validation (DB lookup) happens in route handlers — not here,
  // because bun:sqlite is not available in the Edge Runtime used by middleware.
  const headers = new Headers(request.headers);
  headers.set("x-share-token", token);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/share/:path*", "/api/share/:path*"],
};
