/**
 * MEICENTO HUD - Utility Functions
 */
import { C, getColorByPercent } from './colors.js';

export function formatValue(n: number): string {
  if (n >= 950_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

export function renderBar(percent: number, width: number = 10): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const colorFn = getColorByPercent(clamped);
  return colorFn('█'.repeat(filled)) + C.dim('░'.repeat(empty));
}

export function formatResetTime(dateOrStr: Date | string | null | undefined): string | null {
  if (!dateOrStr) return null;
  const date = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr);
  if (isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d${diffHours % 24}h`;
  }
  return `${diffHours}h${diffMinutes % 60}m`;
}

export function clamp(v: number | null | undefined): number {
  if (v == null || !isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}
