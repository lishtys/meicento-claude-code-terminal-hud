/**
 * MEICENTO HUD - Utility Functions
 */
import { c, getThresholdColor } from './colors.js';

export function formatValue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function renderProgressBar(percentage: number, length = 15): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  const colorFn = getThresholdColor(percentage);
  const barStr = colorFn('█'.repeat(filled)) + c.gray('░'.repeat(empty));
  return `[${barStr}] ${colorFn(percentage.toFixed(0) + '%')}`;
}

export function formatResetTime(dateOrStr: Date | string | null | undefined): string | null {
  if (!dateOrStr) return null;

  const date = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr);
  if (isNaN(date.getTime())) return null;

  const now = Date.now();
  const diffMs = date.getTime() - now;

  if (diffMs <= 0) return null;

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return `${diffDays}d${remainingHours}h`;
  }

  const remainingMinutes = diffMinutes % 60;
  return `${diffHours}h${remainingMinutes}m`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h${minutes % 60}m`;
  }
  return `${minutes}m${seconds % 60}s`;
}

/**
 * Clamp a value to 0-100 range
 */
export function clamp(v: number | null | undefined): number {
  if (v == null || !isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}
