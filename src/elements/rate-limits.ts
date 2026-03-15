/**
 * Rate Limits Element: 5h: 32%(2h15m) wk: 18%(4d19h)
 */
import { C, getUsageColor } from '../colors.js';
import { formatResetTime, clamp } from '../utils.js';
import type { RateLimits, UsageResult } from '../types.js';

export function renderRateLimitsApi(limits: RateLimits, stale?: boolean): string {
  const parts: string[] = [];
  const staleMarker = stale ? C.dim('*') : '';

  // 5-hour
  const fh = Math.round(clamp(limits.fiveHourPercent));
  const fhColor = getUsageColor(fh);
  const fhReset = formatResetTime(limits.fiveHourResetsAt);
  const fhResetStr = fhReset ? C.dim(`(${fhReset})`) : '';
  parts.push(`${C.dim('5h:')} ${fhColor(fh + '%')}${staleMarker}${fhResetStr}`);

  // Weekly
  if (limits.weeklyPercent != null) {
    const wk = Math.round(clamp(limits.weeklyPercent));
    const wkColor = getUsageColor(wk);
    const wkReset = formatResetTime(limits.weeklyResetsAt);
    const wkResetStr = wkReset ? C.dim(`(${wkReset})`) : '';
    parts.push(`${C.dim('wk:')} ${wkColor(wk + '%')}${staleMarker}${wkResetStr}`);
  }

  // Monthly
  if (limits.monthlyPercent != null) {
    const mo = Math.round(clamp(limits.monthlyPercent));
    const moColor = getUsageColor(mo);
    const moReset = formatResetTime(limits.monthlyResetsAt);
    const moResetStr = moReset ? C.dim(`(${moReset})`) : '';
    parts.push(`${C.dim('mo:')} ${moColor(mo + '%')}${staleMarker}${moResetStr}`);
  }

  return parts.join(' ');
}

export function renderRateLimitsError(result: UsageResult): string | null {
  if (!result.error) return null;
  if (result.error === 'no_credentials') return null;
  if (result.error === 'rate_limited') return result.rateLimits ? null : C.dim('[API 429]');
  if (result.error === 'auth') return C.yellow('[API auth]');
  return C.yellow('[API err]');
}

export function renderRateLimitsStdin(limits: {
  five_hour_percent?: number;
  weekly_percent?: number;
  weekly_resets_at?: string;
} | null): string | null {
  if (!limits || (!limits.five_hour_percent && !limits.weekly_percent)) return null;

  const parts: string[] = [];

  if (typeof limits.five_hour_percent === 'number') {
    const color = getUsageColor(limits.five_hour_percent);
    parts.push(`${C.dim('5h:')} ${color(limits.five_hour_percent.toFixed(0) + '%')}`);
  }

  if (typeof limits.weekly_percent === 'number') {
    const color = getUsageColor(limits.weekly_percent);
    const reset = formatResetTime(limits.weekly_resets_at);
    const resetStr = reset ? C.dim(`(${reset})`) : '';
    parts.push(`${C.dim('wk:')} ${color(limits.weekly_percent.toFixed(0) + '%')}${resetStr}`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}
