import type { BackupRunStatus } from '../lib/types';

// Status pill for a backup run. Server-safe.
const LABEL: Record<BackupRunStatus, string> = { success: 'Success', failed: 'Failed', running: 'Running' };
const COLOR: Record<BackupRunStatus, string> = {
  success: 'text-up',
  failed: 'text-down',
  running: 'text-degraded',
};

export default function BackupStatus({ status }: { status: BackupRunStatus }) {
  return (
    <span className={`text-sm font-bold ${COLOR[status] || 'text-muted-foreground'}`}>
      {LABEL[status] || status}
    </span>
  );
}
