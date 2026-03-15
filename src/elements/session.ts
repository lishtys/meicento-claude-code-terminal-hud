/**
 * MEICENTO HUD - Session Duration Element
 *
 * Health coloring based on session age and context usage:
 * Green: <60min + ctx<70%
 * Yellow: 60-120min or ctx 70-85%
 * Red: >120min or ctx>85%
 */
import { c, ICONS } from '../colors.js';

export function renderSession(duration: string, contextPercent: number): string {
  const colorFn = getSessionHealthColor(duration, contextPercent);
  return colorFn(`${ICONS.time} ${duration}`);
}

function getSessionHealthColor(
  duration: string,
  contextPercent: number,
): (s: string) => string {
  const minutes = parseDurationMinutes(duration);

  // Red: >120min or ctx>85%
  if (minutes > 120 || contextPercent > 85) return c.red;
  // Yellow: 60-120min or ctx 70-85%
  if (minutes > 60 || contextPercent > 70) return c.yellow;
  // Green: healthy
  return c.green;
}

function parseDurationMinutes(duration: string): number {
  // Parse formats like "1h23m", "45m", "2h"
  let total = 0;
  const hourMatch = duration.match(/(\d+)h/);
  const minMatch = duration.match(/(\d+)m/);
  if (hourMatch) total += parseInt(hourMatch[1]) * 60;
  if (minMatch) total += parseInt(minMatch[1]);
  return total;
}
