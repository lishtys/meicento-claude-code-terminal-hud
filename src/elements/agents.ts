/**
 * Agents Activity Element (optional line):
 * ◐ planner[Sonnet]: Analyze architecture (45s)
 * ✓ code-reviewer: Review changes (2m15s)
 *
 * Running=yellow ◐, Completed=green ✓
 * Agent type in magenta, details in dim
 */
import { C, ICONS } from '../colors.js';
import type { ActiveAgent } from '../types.js';

export function renderAgentLines(agents: ActiveAgent[]): string[] {
  const lines: string[] = [];
  const running = agents.filter(a => a.status === 'running');
  const completed = agents.filter(a => a.status === 'completed');

  const toShow = [...running.slice(0, 2), ...completed.slice(-1)];

  for (const a of toShow) {
    const icon = a.status === 'running'
      ? C.yellow(ICONS.running)
      : C.green(ICONS.completed);
    const type = C.magenta(a.type || 'agent');
    const model = a.model ? C.dim(`[${a.model}]`) : '';
    const desc = a.description ? C.dim(`: ${a.description}`) : '';
    const elapsed = formatElapsed(a);

    lines.push(`${icon} ${type}${model}${desc} ${elapsed}`);
  }

  return lines;
}

function formatElapsed(a: ActiveAgent): string {
  const end = a.endTime ? a.endTime.getTime() : Date.now();
  const ms = end - a.startTime.getTime();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);

  if (m > 0) return C.dim(`(${m}m${s % 60}s)`);
  return C.dim(`(${s}s)`);
}
