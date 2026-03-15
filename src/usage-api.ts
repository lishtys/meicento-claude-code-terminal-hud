/**
 * MEICENTO HUD - Usage API
 *
 * Fetches rate limit usage from Anthropic's OAuth API.
 *
 * Authentication:
 * - macOS: Reads from Keychain "Claude Code-credentials"
 * - Fallback: Reads from ~/.claude/.credentials.json
 *
 * API: api.anthropic.com/api/oauth/usage
 * Response: { five_hour: { utilization }, seven_day: { utilization } }
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  mkdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import https from 'node:https';
import { clamp } from './utils.js';
import type { RateLimits, UsageResult } from './types.js';

// Cache configuration (aligned with oh-my-claudecode)
const CACHE_TTL_SUCCESS_MS = 90 * 1000;       // 90s poll interval (OMC default)
const CACHE_TTL_FAILURE_MS = 15 * 1000;
const CACHE_TTL_NETWORK_MS = 2 * 60 * 1000;
const MAX_RATE_LIMITED_BACKOFF_MS = 5 * 60 * 1000;
const API_TIMEOUT_MS = 10_000;
const MAX_STALE_DATA_MS = 15 * 60 * 1000;

const TOKEN_REFRESH_HOSTNAME = 'platform.claude.com';
const TOKEN_REFRESH_PATH = '/v1/oauth/token';
const DEFAULT_OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

interface Credentials {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
  source: 'keychain' | 'file';
}

interface CacheEntry {
  timestamp: number;
  data: RateLimits | null;
  error?: boolean;
  errorReason?: string;
  rateLimited?: boolean;
  rateLimitedCount?: number;
  rateLimitedUntil?: number;
  lastSuccessAt?: number;
}

// --- Cache Path ---

function getCachePath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  // Store cache outside install dir so reinstalls don't wipe it
  return join(homeDir, '.cache', 'meicento-hud', '.usage-cache.json');
}

function getClaudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(process.env.HOME || '~', '.claude');
}

// --- Cache Operations ---

function readCache(): CacheEntry | null {
  try {
    const cachePath = getCachePath();
    if (!existsSync(cachePath)) return null;
    const content = readFileSync(cachePath, 'utf-8');
    const cache: CacheEntry = JSON.parse(content);

    // Re-hydrate Date fields
    if (cache.data) {
      if (cache.data.fiveHourResetsAt) {
        cache.data.fiveHourResetsAt = new Date(cache.data.fiveHourResetsAt as unknown as string);
      }
      if (cache.data.weeklyResetsAt) {
        cache.data.weeklyResetsAt = new Date(cache.data.weeklyResetsAt as unknown as string);
      }
      if (cache.data.monthlyResetsAt) {
        cache.data.monthlyResetsAt = new Date(cache.data.monthlyResetsAt as unknown as string);
      }
    }
    return cache;
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry): void {
  try {
    const cachePath = getCachePath();
    const cacheDir = dirname(cachePath);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    // Atomic write: tmp + rename
    const tmpPath = `${cachePath}.tmp.${process.pid}`;
    try {
      writeFileSync(tmpPath, JSON.stringify(entry, null, 2));
      renameSync(tmpPath, cachePath);
    } catch {
      try {
        if (existsSync(tmpPath)) unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch {
    // Ignore cache write errors
  }
}

function isCacheValid(cache: CacheEntry): boolean {
  const age = Date.now() - cache.timestamp;

  if (cache.rateLimited) {
    if (cache.rateLimitedUntil != null) {
      return Date.now() < cache.rateLimitedUntil;
    }
    const count = cache.rateLimitedCount || 1;
    const backoff = Math.min(
      CACHE_TTL_SUCCESS_MS * Math.pow(2, Math.max(0, count - 1)),
      MAX_RATE_LIMITED_BACKOFF_MS,
    );
    return age < backoff;
  }

  if (cache.error) {
    const ttl = cache.errorReason === 'network' ? CACHE_TTL_NETWORK_MS : CACHE_TTL_FAILURE_MS;
    return age < ttl;
  }

  return age < CACHE_TTL_SUCCESS_MS;
}

function hasUsableStaleData(cache: CacheEntry | null): boolean {
  if (!cache?.data) return false;
  if (cache.lastSuccessAt && Date.now() - cache.lastSuccessAt > MAX_STALE_DATA_MS) return false;
  return true;
}

function getCachedResult(cache: CacheEntry): UsageResult {
  if (cache.rateLimited) {
    if (!hasUsableStaleData(cache) && cache.data) {
      return { rateLimits: null, error: 'rate_limited' };
    }
    return { rateLimits: cache.data, error: 'rate_limited', stale: cache.data ? true : undefined };
  }

  if (cache.error) {
    const reason = cache.errorReason || 'network';
    if (hasUsableStaleData(cache)) {
      return { rateLimits: cache.data, error: reason, stale: true };
    }
    return { rateLimits: null, error: reason };
  }

  return { rateLimits: cache.data };
}

// --- Credential Reading ---

function getKeychainServiceName(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    const hash = createHash('sha256').update(configDir).digest('hex').slice(0, 8);
    return `Claude Code-credentials-${hash}`;
  }
  return 'Claude Code-credentials';
}

function readKeychainCredentials(): Credentials | null {
  if (process.platform !== 'darwin') return null;
  try {
    const serviceName = getKeychainServiceName();
    const result = execSync(
      `/usr/bin/security find-generic-password -s "${serviceName}" -w 2>/dev/null`,
      { encoding: 'utf-8', timeout: 2000 },
    ).trim();
    if (!result) return null;

    const parsed = JSON.parse(result);
    const creds = parsed.claudeAiOauth || parsed;
    if (creds.accessToken) {
      return {
        accessToken: creds.accessToken,
        expiresAt: creds.expiresAt,
        refreshToken: creds.refreshToken,
        source: 'keychain',
      };
    }
  } catch {
    // Keychain access failed
  }
  return null;
}

function readFileCredentials(): Credentials | null {
  try {
    const credPath = join(getClaudeConfigDir(), '.credentials.json');
    if (!existsSync(credPath)) return null;
    const content = readFileSync(credPath, 'utf-8');
    const parsed = JSON.parse(content);
    const creds = parsed.claudeAiOauth || parsed;
    if (creds.accessToken) {
      return {
        accessToken: creds.accessToken,
        expiresAt: creds.expiresAt,
        refreshToken: creds.refreshToken,
        source: 'file',
      };
    }
  } catch {
    // File read failed
  }
  return null;
}

function getCredentials(): Credentials | null {
  return readKeychainCredentials() || readFileCredentials();
}

function validateCredentials(creds: Credentials): boolean {
  if (!creds.accessToken) return false;
  if (creds.expiresAt != null && creds.expiresAt <= Date.now()) return false;
  return true;
}

// --- Token Refresh ---

function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
} | null> {
  return new Promise((resolve) => {
    const clientId = process.env.CLAUDE_CODE_OAUTH_CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }).toString();

    const req = https.request(
      {
        hostname: TOKEN_REFRESH_HOSTNAME,
        path: TOKEN_REFRESH_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: API_TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.access_token) {
                resolve({
                  accessToken: parsed.access_token,
                  refreshToken: parsed.refresh_token || refreshToken,
                  expiresAt: parsed.expires_in
                    ? Date.now() + parsed.expires_in * 1000
                    : parsed.expires_at,
                });
                return;
              }
            } catch {
              // JSON parse failed
            }
          }
          resolve(null);
        });
      },
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end(body);
  });
}

function writeBackCredentials(creds: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}): void {
  try {
    const credPath = join(getClaudeConfigDir(), '.credentials.json');
    if (!existsSync(credPath)) return;
    const content = readFileSync(credPath, 'utf-8');
    const parsed = JSON.parse(content);

    if (parsed.claudeAiOauth) {
      parsed.claudeAiOauth.accessToken = creds.accessToken;
      if (creds.expiresAt != null) parsed.claudeAiOauth.expiresAt = creds.expiresAt;
      if (creds.refreshToken) parsed.claudeAiOauth.refreshToken = creds.refreshToken;
    } else {
      parsed.accessToken = creds.accessToken;
      if (creds.expiresAt != null) parsed.expiresAt = creds.expiresAt;
      if (creds.refreshToken) parsed.refreshToken = creds.refreshToken;
    }

    const tmpPath = `${credPath}.tmp.${process.pid}`;
    try {
      writeFileSync(tmpPath, JSON.stringify(parsed, null, 2), { mode: 0o600 });
      renameSync(tmpPath, credPath);
    } catch {
      try {
        if (existsSync(tmpPath)) unlinkSync(tmpPath);
      } catch {
        // Ignore
      }
    }
  } catch {
    // Silent failure
  }
}

// --- API Fetch ---

function fetchUsageFromApi(accessToken: string): Promise<{
  data: Record<string, unknown> | null;
  rateLimited?: boolean;
}> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/api/oauth/usage',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'anthropic-beta': 'oauth-2025-04-20',
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve({ data: JSON.parse(data) });
            } catch {
              resolve({ data: null });
            }
          } else if (res.statusCode === 429) {
            resolve({ data: null, rateLimited: true });
          } else {
            resolve({ data: null });
          }
        });
      },
    );
    req.on('error', () => resolve({ data: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ data: null });
    });
    req.end();
  });
}

// --- Response Parsing ---

function parseDate(dateStr: unknown): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function parseUsageResponse(response: Record<string, unknown>): RateLimits | null {
  const fiveHourObj = response.five_hour as { utilization?: number; resets_at?: string } | undefined;
  const sevenDayObj = response.seven_day as { utilization?: number; resets_at?: string } | undefined;

  const fiveHour = fiveHourObj?.utilization;
  const sevenDay = sevenDayObj?.utilization;

  if (fiveHour == null && sevenDay == null) return null;

  return {
    fiveHourPercent: clamp(fiveHour),
    weeklyPercent: sevenDay != null ? clamp(sevenDay) : undefined,
    fiveHourResetsAt: parseDate(fiveHourObj?.resets_at),
    weeklyResetsAt: parseDate(sevenDayObj?.resets_at),
  };
}

// --- Public API ---

export async function getUsage(): Promise<UsageResult> {
  // Check cache first
  const cache = readCache();
  if (cache && isCacheValid(cache)) {
    return getCachedResult(cache);
  }

  // Get credentials
  let creds = getCredentials();
  if (!creds) {
    writeCache({
      timestamp: Date.now(),
      data: null,
      error: true,
      errorReason: 'no_credentials',
    });
    return { rateLimits: null, error: 'no_credentials' };
  }

  // Validate and refresh if needed
  if (!validateCredentials(creds)) {
    if (creds.refreshToken) {
      const refreshed = await refreshAccessToken(creds.refreshToken);
      if (refreshed) {
        creds = { ...creds, ...refreshed };
        writeBackCredentials(creds);
      } else {
        writeCache({
          timestamp: Date.now(),
          data: null,
          error: true,
          errorReason: 'auth',
        });
        return { rateLimits: null, error: 'auth' };
      }
    } else {
      writeCache({
        timestamp: Date.now(),
        data: null,
        error: true,
        errorReason: 'auth',
      });
      return { rateLimits: null, error: 'auth' };
    }
  }

  // Fetch from API
  const result = await fetchUsageFromApi(creds.accessToken);

  if (result.rateLimited) {
    const prevCount = cache?.rateLimitedCount || 0;
    const backoff = Math.min(
      CACHE_TTL_SUCCESS_MS * Math.pow(2, prevCount),
      MAX_RATE_LIMITED_BACKOFF_MS,
    );
    const entry: CacheEntry = {
      timestamp: Date.now(),
      data: cache?.data || null,
      error: true,
      errorReason: 'rate_limited',
      rateLimited: true,
      rateLimitedCount: prevCount + 1,
      rateLimitedUntil: Date.now() + backoff,
      lastSuccessAt: cache?.lastSuccessAt,
    };
    writeCache(entry);

    if (entry.data && hasUsableStaleData(entry)) {
      return { rateLimits: entry.data, error: 'rate_limited', stale: true };
    }
    return { rateLimits: null, error: 'rate_limited' };
  }

  if (!result.data) {
    const fallbackData = hasUsableStaleData(cache) ? cache!.data : null;
    writeCache({
      timestamp: Date.now(),
      data: fallbackData,
      error: true,
      errorReason: 'network',
      lastSuccessAt: cache?.lastSuccessAt,
    });
    if (fallbackData) {
      return { rateLimits: fallbackData, error: 'network', stale: true };
    }
    return { rateLimits: null, error: 'network' };
  }

  const usage = parseUsageResponse(result.data);
  writeCache({
    timestamp: Date.now(),
    data: usage,
    error: !usage ? true : undefined,
    lastSuccessAt: Date.now(),
  });
  return { rateLimits: usage };
}
