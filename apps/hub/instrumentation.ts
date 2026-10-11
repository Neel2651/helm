// Starts the background jobs when the Node.js server boots: URL health checks and backup schedules.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMonitor } = await import('./lib/monitor');
    const { startScheduler } = await import('./lib/scheduler');
    startMonitor();
    startScheduler();
  }
}
