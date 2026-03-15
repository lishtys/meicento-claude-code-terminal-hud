/**
 * MEICENTO HUD - Token Display Element
 *
 * Enhanced display with reasoning tokens and session totals:
 * tok:i1.2k/o567 r890 s5.6k
 */
import { c, ICONS } from '../colors.js';
import { formatValue } from '../utils.js';
import type { LastRequestTokenUsage } from '../types.js';

export function renderTokens(
  totalInput: number,
  totalOutput: number,
  lastRequest?: LastRequestTokenUsage,
  sessionTotal?: number,
): string {
  const parts: string[] = [];

  // Last request tokens (if available from transcript)
  if (lastRequest) {
    parts.push(`i${formatValue(lastRequest.inputTokens)}/o${formatValue(lastRequest.outputTokens)}`);
    if (lastRequest.reasoningTokens && lastRequest.reasoningTokens > 0) {
      parts.push(`r${formatValue(lastRequest.reasoningTokens)}`);
    }
  } else {
    // Fallback to stdin totals
    parts.push(`${formatValue(totalInput)}i/${formatValue(totalOutput)}o`);
  }

  // Session total (if available)
  if (sessionTotal && sessionTotal > 0) {
    parts.push(`s${formatValue(sessionTotal)}`);
  }

  return c.token(`${ICONS.token} ${parts.join(' ')}`);
}
