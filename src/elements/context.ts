/**
 * Context Element: ██████████░░░░░░░░░░ 45%
 *
 * Bar and percentage colored by threshold (green/yellow/red).
 */
import { getColorByPercent } from '../colors.js';
import { renderBar } from '../utils.js';

export function renderContext(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const colorFn = getColorByPercent(clamped);
  return `${renderBar(clamped)} ${colorFn(clamped + '%')}`;
}
