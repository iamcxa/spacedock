// spacebridge/src/daemon/index.ts
// ABOUTME: Barrel export for the daemon module — PID utils, lock utils, auto-fork logic.

export { writePidFile, readPidFile, isProcessAlive, cleanStalePidFile } from "./pid";
export { acquireLock, releaseLock } from "./lock";
export type { AcquireLockOptions } from "./lock";
export { autoForkDaemon, resolveDaemonCommand } from "./auto-fork";
export type { AutoForkOptions } from "./auto-fork";
