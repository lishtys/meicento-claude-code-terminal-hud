/**
 * MEICENTO HUD - Context Warning Element
 *
 * Shows warning when context >= 80%:
 * [!] ctx 85% >= 80% - run /compact
 */
import { c } from '../colors.js';

const CONTEXT_WARNING_THRESHOLD = 80;

export function renderContextWarning(contextPercent: number): string | null {
  if (contextPercent < CONTEXT_WARNING_THRESHOLD) return null;

  return c.red(`[!] ctx ${Math.round(contextPercent)}% >= ${CONTEXT_WARNING_THRESHOLD}% - run /compact`);
}
