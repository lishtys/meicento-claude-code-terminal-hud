/**
 * MEICENTO HUD - MCP Server Count Element
 */
import { c, ICONS } from '../colors.js';

export function renderMcp(count: number): string | null {
  if (count <= 0) return null;
  return c.mcp(`${ICONS.mcp} ${count}`);
}
