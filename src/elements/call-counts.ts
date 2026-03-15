/**
 * MEICENTO HUD - Call Counts Element
 *
 * Format: T:42 A:7 S:3 (omit zero counters)
 */
import { c } from '../colors.js';

export function renderCallCounts(
  toolCount: number,
  agentCount: number,
  skillCount: number,
): string | null {
  const parts: string[] = [];

  if (toolCount > 0) parts.push(`T:${toolCount}`);
  if (agentCount > 0) parts.push(`A:${agentCount}`);
  if (skillCount > 0) parts.push(`S:${skillCount}`);

  if (parts.length === 0) return null;

  return c.dim(parts.join(' '));
}
