/**
 * Context Element: ██████████░░░░░░░░░░ 45%
 */
import { getBarColor } from '../colors.js';
import { renderBar } from '../utils.js';

export function renderContext(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const colorFn = getBarColor(clamped);
  return `${renderBar(clamped)} ${colorFn(clamped + '%')}`;
}
