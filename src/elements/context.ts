/**
 * MEICENTO HUD - Context Progress Bar Element
 */
import { renderProgressBar } from '../utils.js';

export function renderContext(percentage: number): string {
  return renderProgressBar(percentage);
}
