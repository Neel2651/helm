// Ambient globals used to guard the background jobs against double-starting
// (see lib/monitor.ts and lib/scheduler.ts). Next.js can re-evaluate a module
// within the same process (e.g. during development), so these live on
// globalThis rather than as a module-level variable.
declare global {
  var __helmMonitorStarted: boolean | undefined;
  var __helmScheduler: boolean | undefined;
}

export {};
