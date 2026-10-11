import cron, { type ScheduledTask } from 'node-cron';
import { listProjects } from './store';
import { startBackup } from './backup';

interface ScheduleEntry {
  expr: string;
  task: ScheduledTask;
}

// slug -> { expr, task }. Schedules are re-read every minute so edits take effect without a restart.
const tasks = new Map<string, ScheduleEntry>();

export function syncSchedules(): void {
  const wanted = new Map<string, string>();
  for (const project of listProjects()) {
    const expr = project.backup?.cron;
    if (project.backup?.enabled && expr && cron.validate(expr)) wanted.set(project.slug, expr);
  }

  for (const [slug, entry] of tasks) {
    if (wanted.get(slug) !== entry.expr) {
      entry.task.stop();
      tasks.delete(slug);
    }
  }

  for (const [slug, expr] of wanted) {
    if (tasks.has(slug)) continue;
    const task = cron.schedule(expr, () => {
      try {
        startBackup(slug, 'schedule'); // the run records its own result in the store
      } catch (err) {
        console.error(`[helm] scheduled backup skipped for ${slug}: ${err instanceof Error ? err.message : err}`);
      }
    });
    tasks.set(slug, { expr, task });
  }
}

export function startScheduler(): void {
  if (globalThis.__helmScheduler) return;
  globalThis.__helmScheduler = true;
  syncSchedules();
  setInterval(syncSchedules, 60 * 1000);
}
