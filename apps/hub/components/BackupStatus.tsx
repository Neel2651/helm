import type { BackupRunStatus } from '../lib/types';

// Status pill for a backup run. Server-safe.
const LABEL: Record<BackupRunStatus, string> = { success: 'Success', failed: 'Failed', running: 'Running' };
const COLOR: Record<BackupRunStatus, string> = { success: 'var(--up)', failed: 'var(--down)', running: 'var(--degraded)' };

export default function BackupStatus({ status }: { status: BackupRunStatus }) {
  return (
    <span className="small" style={{ color: COLOR[status] || 'var(--muted)', fontWeight: 700 }}>
      {LABEL[status] || status}
    </span>
  );
}
