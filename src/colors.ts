/**
 * MEICENTO HUD - Colors, Icons & Helpers
 *
 * Uses raw ANSI escape codes instead of picocolors because
 * the statusline output goes through a pipe (not TTY),
 * and color libraries like picocolors auto-disable colors.
 *
 * Color scheme based on claude-ultimate-hud:
 * - Cyan: model name, skills, tool names, git branch
 * - Yellow: project dir, running indicators, warnings
 * - Green: completed indicators, healthy metrics
 * - Red: critical metrics, danger warnings
 * - Magenta: thinking state, git delimiters, agent types
 * - Dim: separators, secondary info, counts, durations
 */

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';
const ORANGE = '\x1b[38;5;208m';
const BRIGHT_WHITE = '\x1b[97m';

function wrap(color: string): (s: string) => string {
  return (s: string) => `${color}${s}${RESET}`;
}

export const C = {
  reset: wrap(RESET),
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
  dim: wrap(DIM),
  red: wrap(RED),
  green: wrap(GREEN),
  yellow: wrap(YELLOW),
  blue: wrap('\x1b[34m'),
  magenta: wrap(MAGENTA),
  cyan: wrap(CYAN),
  gray: wrap(DIM),
  orange: wrap(ORANGE),
  boldRed: wrap(`${BOLD}${RED}`),
  boldReverseRed: wrap(`${BOLD}\x1b[7m${RED}`),
  brightWhite: wrap(BRIGHT_WHITE),
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
  return ` ${DIM}│${RESET} `;
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

/**
 * 6-tier color system for CHEN MI bar:
 *   0-14%  = green
 *  15-19%  = yellow
 *  20-39%  = orange
 *  40-59%  = red
 *  60-79%  = bold red
 *  80-100% = bold reverse red
 */
export function getColorByPercent6Tier(percent: number): (s: string) => string {
  if (percent >= 80) return C.boldReverseRed;
  if (percent >= 60) return C.boldRed;
  if (percent >= 40) return C.red;
  if (percent >= 20) return C.orange;
  if (percent >= 15) return C.yellow;
  return C.green;
}
