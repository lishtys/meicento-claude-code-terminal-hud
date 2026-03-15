/**
 * MEICENTO HUD - Active Agents Element
 *
 * Format: agents:[architect(2m),explore] with duration for running agents
 */
import { c } from '../colors.js';
import type { ActiveAgent } from '../types.js';

export function renderAgents(agents: ActiveAgent[]): string | null {
  const running = agents.filter(a => a.status === 'running');
  if (running.length === 0) return null;

  const items = running.map(a => {
    const name = a.description || a.type || 'agent';
    const elapsed = Date.now() - a.startTime.getTime();
    const minutes = Math.floor(elapsed / 60_000);

    if (minutes > 0) {
      return `${name}(${minutes}m)`;
    }
    return name;
  });

  return c.cyan(`agents:[${items.join(',')}]`);
}
