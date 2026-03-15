/**
 * MEICENTO HUD - Permission Indicator Element
 *
 * Shows when a tool is pending approval: APPROVE? edit:filename.ts
 */
import { c } from '../colors.js';
import type { PendingPermission } from '../types.js';

export function renderPermission(permission: PendingPermission | undefined): string | null {
  if (!permission) return null;

  const tool = permission.toolName.toLowerCase();
  const target = permission.targetSummary;

  return c.yellow(`APPROVE? ${tool}:${target}`);
}
