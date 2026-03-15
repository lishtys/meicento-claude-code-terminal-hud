/**
 * Thinking Element: 💭 thinking
 */
import { C, ICONS } from '../colors.js';
import type { ThinkingState } from '../types.js';

export function renderThinking(state: ThinkingState | undefined): string | null {
  if (!state?.active) return null;
  return `${ICONS.thinking} ${C.magenta('thinking')}`;
}
