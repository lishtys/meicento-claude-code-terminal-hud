/**
 * Rate Limits Element: 32%(2h15m) │ 18%(4d19h)
 *
 * Percentages colored by threshold, reset times in parentheses.
 */
import { C, getColorByPercent } from '../colors.js';
import { formatResetTime, clamp } from '../utils.js';
import type { RateLimits, UsageResult } from '../types.js';

export function renderRateLimitsApi(limits: RateLimits, stale?: boolean): string {
  const parts: string[] = [];
  const staleMarker = stale ? '*' : '';

  // 5-hour
  const fh = Math.round(clamp(limits.fiveHourPercent));
  const fhColor = getColorByPercent(fh);
  const fhReset = formatResetTime(limits.fiveHourResetsAt);
  let fhStr = `${fhColor(fh + '%')}${staleMarker}`;
  if (fhReset) fhStr += ` (${fhReset})`;
  parts.push(fhStr);

  // Weekly
  if (limits.weeklyPercent != null) {
    const wk = Math.round(clamp(limits.weeklyPercent));
    const wkColor = getColorByPercent(wk);
    const wkReset = formatResetTime(limits.weeklyResetsAt);
    let wkStr = `${wkColor(wk + '%')}${staleMarker}`;
    if (wkReset) wkStr += ` (${wkReset})`;
    parts.push(wkStr);
  }

  // Monthly
  if (limits.monthlyPercent != null) {
    const mo = Math.round(clamp(limits.monthlyPercent));
    const moColor = getColorByPercent(mo);
    const moReset = formatResetTime(limits.monthlyResetsAt);
    let moStr = `${moColor(mo + '%')}${staleMarker}`;
    if (moReset) moStr += ` (${moReset})`;
    parts.push(moStr);
  }

  return parts.join(C.dim(' │ '));
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
    const color = getColorByPercent(limits.five_hour_percent);
    parts.push(`${color(limits.five_hour_percent.toFixed(0) + '%')}`);
  }

  if (typeof limits.weekly_percent === 'number') {
    const color = getColorByPercent(limits.weekly_percent);
    const reset = formatResetTime(limits.weekly_resets_at);
    let part = `${color(limits.weekly_percent.toFixed(0) + '%')}`;
    if (reset) part += ` (${reset})`;
    parts.push(part);
  }

  return parts.length > 0 ? parts.join(C.dim(' │ ')) : null;
}
