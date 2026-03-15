/**
 * Model Element: 🤖 Opus 4
 * Tier coloring: Opus=magenta, Sonnet=yellow, Haiku=green
 */
import { C, ICONS } from '../colors.js';

export function renderModel(displayName: string, modelId?: string): string {
  const name = modelId ? shortName(modelId) : displayName;
  const colorFn = tierColor(modelId);
  return `${ICONS.model} ${colorFn(name)}`;
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

function tierColor(id?: string): (s: string) => string {
  if (!id) return C.cyan;
  const l = id.toLowerCase();
  if (l.includes('opus')) return C.magenta;
  if (l.includes('sonnet')) return C.yellow;
  if (l.includes('haiku')) return C.green;
  return C.cyan;
}
