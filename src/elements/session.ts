/**
 * Session Timer Element: ⏱️ 1h23m
 */
import { C, ICONS } from '../colors.js';

export function renderSession(duration: string): string {
  return C.dim(`${ICONS.timer} ${duration}`);
}
