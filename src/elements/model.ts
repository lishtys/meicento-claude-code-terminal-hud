/**
 * MEICENTO HUD - Model Element
 *
 * Displays the model name with tier-based coloring:
 * Opus=magenta, Sonnet=yellow, Haiku=green
 */
import pc from 'picocolors';
import { c, ICONS } from '../colors.js';

/**
 * Extract a short display name from a model ID.
 * e.g. "claude-sonnet-4-20250514" -> "Sonnet 4"
 *      "claude-opus-4-6" -> "Opus 4.6"
 */
function shortModelName(modelId: string): string {
  const id = modelId.toLowerCase();

  // Match patterns like claude-opus-4-6, claude-sonnet-4-20250514, claude-haiku-4-5-20251001
  const match = id.match(/claude-(\w+)-(\d+)(?:-(\d+))?/);
  if (!match) return modelId;

  const tier = match[1];
  const major = match[2];
  const minor = match[3];

  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

  // If minor looks like a date (>= 2025), omit it
  if (minor && parseInt(minor) >= 2025) {
    return `${tierName} ${major}`;
  }
  if (minor) {
    return `${tierName} ${major}.${minor}`;
  }
  return `${tierName} ${major}`;
}

/**
 * Get tier-specific color function from model ID
 */
function getTierColor(modelId: string | undefined): (s: string) => string {
  if (!modelId) return c.model;
  const id = modelId.toLowerCase();

  if (id.includes('opus')) return (s: string) => pc.bold(pc.magenta(s));
  if (id.includes('sonnet')) return (s: string) => pc.bold(pc.yellow(s));
  if (id.includes('haiku')) return (s: string) => pc.bold(pc.green(s));
  return c.model;
}

export function renderModel(displayName: string, modelId?: string): string {
  const name = modelId ? shortModelName(modelId) : displayName;
  const colorFn = getTierColor(modelId);
  return colorFn(`${ICONS.model} ${name}`);
}
