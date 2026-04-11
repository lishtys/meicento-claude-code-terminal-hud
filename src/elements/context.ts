/**
 * Context Element: [ ██⣏⣉⠀⡇⠶⢸⡇⣛⠀⡇⢣⢸⠀⡇⠙⠋⢸⣉⠶██ ] 45%
 *
 * CHEN MI Braille dot-matrix bar with 6-tier color percentage.
 */
import { getColorByPercent6Tier } from '../colors.js';
import { renderChenMiBar } from './chen-mi-bar.js';

export function renderContext(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return `${renderChenMiBar(clamped)} ${getColorByPercent6Tier(clamped)(clamped + '%')}`;
}
