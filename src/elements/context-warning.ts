/**
 * Context Warning Element:
 * ⚠️  Context 85% - consider /compact
 * 🔴 Context 95% - /compact recommended!
 */
import { C, ICONS } from '../colors.js';

export function renderContextWarning(percent: number): string | null {
  if (percent >= 90) {
    return `${ICONS.critical} ${C.red(`Context ${Math.round(percent)}% - /compact recommended!`)}`;
  }
  if (percent >= 80) {
    return `${ICONS.warning} ${C.yellow(`Context ${Math.round(percent)}% - consider /compact`)}`;
  }
  return null;
}
