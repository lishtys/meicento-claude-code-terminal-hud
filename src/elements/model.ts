/**
 * Model Element: 🤖 Opus 4
 *
 * Model name displayed in cyan (matching claude-ultimate-hud).
 * The emoji icon is also part of the cyan coloring.
 */
import { C, ICONS } from '../colors.js';

export function renderModel(displayName: string, modelId?: string): string {
  const name = modelId ? shortName(modelId) : displayName;
  return C.cyan(`${ICONS.model} ${name}`);
}

function shortName(id: string): string {
  const m = id.toLowerCase().match(/claude-(\w+)-(\d+)(?:-(\d+))?/);
  if (!m) return id;
  const tier = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const minor = m[3];
  if (minor && parseInt(minor) >= 2025) return `${tier} ${m[2]}`;
  if (minor) return `${tier} ${m[2]}.${minor}`;
  return `${tier} ${m[2]}`;
}
