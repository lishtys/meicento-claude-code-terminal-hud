/**
 * MEICENTO HUD - Thinking Indicator Element
 *
 * Shows when extended thinking was seen within last 30s
 */
import { c } from '../colors.js';
import type { ThinkingState } from '../types.js';

export function renderThinking(state: ThinkingState | undefined): string | null {
  if (!state?.active) return null;
  return c.cyan('thinking');
}
