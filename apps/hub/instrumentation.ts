// Starts the background jobs when the Node.js server boots: URL health checks and backup schedules.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMonitor } = await import('./lib/monitor');
    const { startScheduler } = await import('./lib/scheduler');
    const { recoverStaleBackups } = await import('./lib/backup');
    // Before anything else starts: clear out any backup left stuck "running" from before
    // this boot (see recoverStaleBackups' own comment for why that's always safe to do here).
    await recoverStaleBackups();
    startMonitor();
    startScheduler();
  }
}
