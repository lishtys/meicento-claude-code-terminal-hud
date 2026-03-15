/**
 * MEICENTO HUD - Color Palette & Icons
 */
import pc from 'picocolors';

export const c = {
  // Base
  reset: (s: string) => pc.reset(s),
  bold: (s: string) => pc.bold(s),
  dim: (s: string) => pc.dim(s),

  // Colors
  red: (s: string) => pc.red(s),
  green: (s: string) => pc.green(s),
  yellow: (s: string) => pc.yellow(s),
  blue: (s: string) => pc.blue(s),
  magenta: (s: string) => pc.magenta(s),
  cyan: (s: string) => pc.cyan(s),
  gray: (s: string) => pc.gray(s),

  // Semantic
  model: (s: string) => pc.bold(pc.blue(s)),
  token: (s: string) => pc.cyan(s),
  dir: (s: string) => pc.magenta(s),
  repo: (s: string) => pc.cyan(s),
  git: (s: string) => pc.yellow(s),
  time: (s: string) => pc.green(s),
  mcp: (s: string) => pc.red(s),
  tag: (s: string) => pc.bold(pc.magenta(s)),
};

export const ICONS = {
  model: '󰚩',
  token: '󰌠',
  dir: '󰉖',
  repo: '󰋚',
  git: '󰊢',
  time: '󱑎',
  mcp: '󰒋',
  limits: 'limits',
  sep: '│',
};

const WARNING_THRESHOLD = 70;
const CRITICAL_THRESHOLD = 90;

export function getThresholdColor(percent: number): (s: string) => string {
  if (percent >= CRITICAL_THRESHOLD) return c.red;
  if (percent >= WARNING_THRESHOLD) return c.yellow;
  return c.green;
}
