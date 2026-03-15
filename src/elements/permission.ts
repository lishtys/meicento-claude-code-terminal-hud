/**
 * Permission Element: ◐ APPROVE? edit: filename.ts
 */
import { C, ICONS } from '../colors.js';
import type { PendingPermission } from '../types.js';

export function renderPermission(permission: PendingPermission | undefined): string | null {
  if (!permission) return null;
  const tool = permission.toolName.toLowerCase();
  return `${C.yellow(ICONS.running)} ${C.yellow('APPROVE?')} ${C.cyan(tool)}: ${C.dim(permission.targetSummary)}`;
}
