// Shared display helpers. Server-safe (no hooks).
import type { HealthState } from '../lib/types';

const STATE_LABEL: Record<HealthState, string> = {
  up: 'Up',
  degraded: 'Degraded',
  down: 'Down',
  unknown: 'No checks yet',
};

const STATE_CLASS: Record<HealthState, string> = {
  up: 'bg-up-soft text-up',
  degraded: 'bg-degraded-soft text-degraded',
  down: 'bg-down-soft text-down',
  unknown: 'bg-unknown-soft text-unknown',
};

export function StateBadge({ state = 'unknown' as HealthState }: { state?: HealthState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current ${
        STATE_CLASS[state] || STATE_CLASS.unknown
      }`}
    >
      {STATE_LABEL[state] || state}
    </span>
  );
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatUptime(ms: number | null | undefined): string {
  if (!ms) return '—';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}
