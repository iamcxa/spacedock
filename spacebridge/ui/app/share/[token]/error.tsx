"use client";

// ABOUTME: Error boundary for share view — no navigation bar (external users, A-13).

export default function ShareError({ error }: { error: Error }) {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  );
}
