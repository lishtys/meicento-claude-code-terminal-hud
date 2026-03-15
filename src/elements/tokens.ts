/**
 * Tokens Element: i90K/o25K  or  i1.2K/o567 r890 s5.6K
 *
 * Token counts in plain text (no dim) for readability.
 */
import { formatValue } from '../utils.js';
import type { LastRequestTokenUsage } from '../types.js';

export function renderTokens(
  totalInput: number,
  totalOutput: number,
  lastRequest?: LastRequestTokenUsage,
  sessionTotal?: number,
): string {
  const parts: string[] = [];

  if (lastRequest) {
    parts.push(`i${formatValue(lastRequest.inputTokens)}/o${formatValue(lastRequest.outputTokens)}`);
    if (lastRequest.reasoningTokens && lastRequest.reasoningTokens > 0) {
      parts.push(`r${formatValue(lastRequest.reasoningTokens)}`);
    }
  } else {
    parts.push(`i${formatValue(totalInput)}/o${formatValue(totalOutput)}`);
  }

  if (sessionTotal && sessionTotal > 0) {
    parts.push(`s${formatValue(sessionTotal)}`);
  }

  return parts.join(' ');
}
