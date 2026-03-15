/**
 * Call Counts Element: T:42 A:3 S:1
 */
import { C } from '../colors.js';

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
  return C.dim(parts.join(' '));
}
