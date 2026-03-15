/**
 * MEICENTO HUD - Rate Limits Element
 *
 * Supports two modes:
 * 1. API-sourced with progress bars: 5h:[████░░░░]45%(3h42m) wk:[█░░░░░░░]12%(2d5h)
 * 2. Stdin-sourced text-only fallback: 5h:45% wk:12%(2d5h)
 */
import { c, ICONS, getThresholdColor } from '../colors.js';
import { formatResetTime, clamp } from '../utils.js';
import type { RateLimits, UsageResult } from '../types.js';

const BAR_WIDTH = 8;

/**
 * Render a single rate limit bucket with a progress bar
 */
function renderBucketWithBar(
  label: string,
  percent: number,
  resetsAt?: Date | null,
  stale?: boolean,
): string {
  const pct = clamp(percent);
  const rounded = Math.round(pct);
  const colorFn = getThresholdColor(rounded);

  const filled = Math.round((rounded / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const bar = colorFn('█'.repeat(filled)) + c.dim('░'.repeat(empty));

  const staleMarker = stale ? c.dim('*') : '';
  const resetStr = resetsAt ? formatResetTime(resetsAt) : null;
  const resetPart = resetStr ? c.dim(`(${stale ? '~' : ''}${resetStr})`) : '';

  return `${c.dim(label + ':')}[${bar}]${colorFn(rounded + '%')}${staleMarker}${resetPart}`;
}

/**
 * Render rate limits with progress bars (API-sourced data)
 */
export function renderRateLimitsWithBar(limits: RateLimits, stale?: boolean): string {
  const parts: string[] = [];

  parts.push(renderBucketWithBar('5h', limits.fiveHourPercent, limits.fiveHourResetsAt, stale));

  if (limits.weeklyPercent != null) {
    parts.push(renderBucketWithBar('wk', limits.weeklyPercent, limits.weeklyResetsAt, stale));
  }

  if (limits.monthlyPercent != null) {
    parts.push(renderBucketWithBar('mo', limits.monthlyPercent, limits.monthlyResetsAt, stale));
  }

  return parts.join(' ');
}

/**
 * Render error indicator for failed API calls
 */
export function renderRateLimitsError(result: UsageResult): string | null {
  if (!result.error) return null;
  if (result.error === 'no_credentials') return null;

  if (result.error === 'rate_limited') {
    return result.rateLimits ? null : c.dim('[API 429]');
  }
  if (result.error === 'auth') return c.yellow('[API auth]');
  return c.yellow('[API err]');
}

/**
 * Render rate limits from stdin data (text-only fallback)
 */
export function renderRateLimitsFromStdin(limits: {
  five_hour_percent?: number;
  weekly_percent?: number;
  weekly_resets_at?: string;
} | null): string | null {
  if (!limits || (!limits.five_hour_percent && !limits.weekly_percent)) {
    return null;
  }

  const parts: string[] = [];
  const fiveHour = limits.five_hour_percent;
  const weekly = limits.weekly_percent;

  if (typeof fiveHour === 'number') {
    const color = getThresholdColor(fiveHour);
    parts.push(`5h:${color(fiveHour.toFixed(0) + '%')}`);
  }

  if (typeof weekly === 'number') {
    const color = getThresholdColor(weekly);
    const reset = formatResetTime(limits.weekly_resets_at);
    let part = `wk:${color(weekly.toFixed(0) + '%')}`;
    if (reset) {
      part += c.dim(`(${reset})`);
    }
    parts.push(part);
  }

  if (parts.length === 0) return null;

  return `${c.dim(ICONS.limits + ' ')}${parts.join(' ')}`;
}
