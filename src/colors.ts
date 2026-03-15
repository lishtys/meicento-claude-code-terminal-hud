/**
 * MEICENTO HUD - Colors, Icons & Helpers
 *
 * Color scheme based on claude-ultimate-hud:
 * - Cyan: model name, skills, tool names, git branch
 * - Yellow: project dir, running indicators, warnings
 * - Green: completed indicators, healthy metrics
 * - Red: critical metrics, danger warnings
 * - Magenta: thinking state, git delimiters, agent types
 * - Dim: separators, secondary info, counts, durations
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

/**
 * Color by percentage thresholds (matching claude-ultimate-hud):
 *   0-50%  = green
 *  51-80%  = yellow
 *  81-100% = red
 */
export function getColorByPercent(percent: number): (s: string) => string {
  if (percent > 80) return C.red;
  if (percent > 50) return C.yellow;
  return C.green;
}
