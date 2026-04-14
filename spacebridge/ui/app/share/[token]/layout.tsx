// ABOUTME: Minimal layout for share view — no sidebar or war room nav.
// External collaborators have no dashboard context (A-13).

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">{children}</div>
    </div>
  );
}
