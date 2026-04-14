export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-2xl font-semibold mb-3">No sessions connected</h2>
      <p className="text-muted-foreground max-w-md">
        No Claude Code sessions connected. Start a session with spacebridge installed to see
        entities here.
      </p>
    </div>
  );
}
