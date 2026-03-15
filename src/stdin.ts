/**
 * MEICENTO HUD - Stdin Reader
 */
import { readFileSync } from 'node:fs';
import type { StatuslineStdin } from './types.js';

export function readStdin(): StatuslineStdin | null {
  try {
    const rawInput = readFileSync(0, 'utf-8');
    if (!rawInput || rawInput.trim() === '') return null;

    return JSON.parse(rawInput) as StatuslineStdin;
  } catch {
    return null;
  }
}

export function getContextPercent(data: StatuslineStdin): number {
  const raw = data.context_window?.used_percentage || 0;
  // Handle both 0-1 and 0-100 ranges
  return raw <= 1 ? raw * 100 : raw;
}

export function getModelName(data: StatuslineStdin): string {
  return data.model?.display_name || data.model?.id || 'Claude';
}

export function getModelId(data: StatuslineStdin): string | undefined {
  return data.model?.id;
}
