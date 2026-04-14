// spacebridge/src/daemon/index.ts
// ABOUTME: Barrel export for the daemon module — PID utils, lock utils, auto-fork logic.

export type { AutoForkOptions } from "./auto-fork";
export { autoForkDaemon, resolveDaemonCommand } from "./auto-fork";
export type { AcquireLockOptions } from "./lock";
export { acquireLock, releaseLock } from "./lock";
export { cleanStalePidFile, isProcessAlive, readPidFile, writePidFile } from "./pid";
