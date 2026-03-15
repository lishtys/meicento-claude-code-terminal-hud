/**
 * MEICENTO HUD - Colors, Icons & Helpers
 */
import pc from 'picocolors';

export const C = {
  reset: pc.reset,
  bold: pc.bold,
  dim: pc.dim,
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  magenta: pc.magenta,
  cyan: pc.cyan,
  gray: pc.gray,
};

export const ICONS = {
  model: '🤖',
  folder: '📁',
  timer: '⏱️',
  thinking: '💭',
  skill: '🎯',
  warning: '⚠️',
  critical: '🔴',
  running: '◐',
  completed: '✓',
  todo: '▸',
};

/** Dim vertical bar separator */
export function sep(): string {
  return ` ${C.dim('│')} `;
}

/** Context bar color: green < 70%, yellow 70-84%, red >= 85% */
export function getBarColor(percent: number): (s: string) => string {
  if (percent >= 85) return C.red;
  if (percent >= 70) return C.yellow;
  return C.green;
}

/** Usage/rate limit color: green < 50%, yellow 50-79%, red >= 80% */
export function getUsageColor(percent: number): (s: string) => string {
  if (percent >= 80) return C.red;
  if (percent >= 50) return C.yellow;
  return C.green;
}
