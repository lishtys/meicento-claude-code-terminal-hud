#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import pc from 'picocolors';

/**
 * MEICENTO Claude Code Terminal HUD
 * 
 * Inspired by:
 * - OMC (oh-my-claudecode)
 * - rathi-prashant/claude-code-terminal-pro
 * - AndyShaman/claude-statusline
 */

// --- COLOR PALETTE & STYLES ---
const c = {
  // Base Colors
  reset: (s: string) => pc.reset(s),
  bold: (s: string) => pc.bold(s),
  dim: (s: string) => pc.dim(s),
  
  // Project Colors
  red: (s: string) => pc.red(s),
  green: (s: string) => pc.green(s),
  yellow: (s: string) => pc.yellow(s),
  blue: (s: string) => pc.blue(s),
  magenta: (s: string) => pc.magenta(s),
  cyan: (s:string) => pc.cyan(s),
  aqua: (s: string) => pc.cyan(s), // Alias for cyan
  gray: (s: string) => pc.gray(s),

  // Semantic Colors
  model: (s: string) => pc.bold(pc.blue(s)),
  token: (s: string) => pc.cyan(s),
  dir: (s: string) => pc.magenta(s),
  repo: (s: string) => pc.cyan(s),
  git: (s: string) => pc.yellow(s),
  time: (s: string) => pc.green(s),
  mcp: (s: string) => pc.red(s),
  tag: (s: string) => pc.bold(pc.magenta(s)),
};

const ICONS = {
  model: '󰚩',
  token: '󰌠',
  dir: '󰉖',
  repo: '󰋚',
  git: '󰊢',
  time: '󱑎',
  mcp: '󰒋',
  limits: 'limits',
  sep: '│',
};

// --- THRESHOLD-BASED COLORING ---
const WARNING_THRESHOLD = 70;
const CRITICAL_THRESHOLD = 90;

function getThresholdColor(percent: number): (s: string) => string {
  if (percent >= CRITICAL_THRESHOLD) return c.red;
  if (percent >= WARNING_THRESHOLD) return c.yellow;
  return c.green;
}

// --- GIT HELPERS ---

function getGitRepoName(cwd?: string): string | null {
  try {
    const url = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      timeout: 1000,
      stdio: ['ignore', 'pipe', 'ignore'], // stdin, stdout, stderr
      shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
    }).trim();

    if (!url) return null;

    const match = url.match(/\/([^/]+?)(?:\.git)?$/) || url.match(/:([^/]+?)(?:\.git)?$/);
    return match ? match[1].replace(/\.git$/, '') : null;
  } catch {
    return null;
  }
}

function getGitBranch(cwd?: string): string | null {
  try {
    return execSync('git branch --show-current', {
      cwd,
      encoding: 'utf-8',
      timeout: 1000,
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
    }).trim();
  } catch {
    return null;
  }
}

// --- USAGE LIMITS HELPERS ---

function formatResetTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const now = Date.now();
  const diffMs = date.getTime() - now;

  if (diffMs <= 0) return null;

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return `${diffDays}d${remainingHours}h`;
  }

  const remainingMinutes = diffMinutes % 60;
  return `${diffHours}h${remainingMinutes}m`;
}

function renderRateLimits(limits: any | null): string | null {
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


// --- GENERAL HELPERS ---

function formatValue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function renderProgressBar(percentage: number, length = 15): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  
  const colorFn = getThresholdColor(percentage);
  const barStr = colorFn('█'.repeat(filled)) + c.gray('░'.repeat(empty));
  return `[${barStr}] ${colorFn(percentage.toFixed(0) + '%')}`;
}

// --- MAIN ---

async function main() {
  try {
    const rawInput = readFileSync(0, 'utf-8');
    if (!rawInput || rawInput.trim() === '') return;

    let data;
    try {
      data = JSON.parse(rawInput);
    } catch (err) {
      return; // Fail gracefully
    }

    // --- DATA EXTRACTION ---
    const model = data.model?.display_name || data.model?.id || 'Claude';
    const rawPercentage = data.context_window?.used_percentage || 0;
    const contextUsage = rawPercentage <= 1 ? rawPercentage * 100 : rawPercentage;
    const totalInput = data.context_window?.total_input_tokens || 0;
    const totalOutput = data.context_window?.total_output_tokens || 0;
    const duration = data.duration || null;
    const mcpCount = data.mcp?.servers_count || 0;
    const rateLimits = data.rate_limits || null;
    
    const workingDir = path.basename(process.cwd());
    const repoName = getGitRepoName();
    const branch = getGitBranch();

    // --- RENDER PIECES ---
    const parts: string[] = [];

    // 1. Tag
    parts.push(c.tag('[MEI]'));

    // 2. Model
    parts.push(`${c.model(ICONS.model + ' ' + model)}`);

    // 3. Progress Bar
    parts.push(renderProgressBar(contextUsage));

    // 4. Tokens
    parts.push(`${c.token(ICONS.token + ' ' + formatValue(totalInput) + 'i/' + formatValue(totalOutput) + 'o')}`);

    // 5. Rate Limits (Optional)
    const limitsPart = renderRateLimits(rateLimits);
    if (limitsPart) {
      parts.push(limitsPart);
    }

    // 6. Session Time (Optional)
    if (duration) {
      parts.push(`${c.time(ICONS.time + ' ' + duration)}`);
    }

    // 7. MCP (Optional)
    if (mcpCount > 0) {
      parts.push(`${c.mcp(ICONS.mcp + ' ' + mcpCount)}`);
    }

    // 8. Project & Git
    const projectParts = [];
    projectParts.push(c.dir(ICONS.dir + ' ' + workingDir));

    if (repoName) {
        projectParts.push(c.repo(`(${ICONS.repo} ${repoName})`));
    }
    if (branch) {
      projectParts.push(c.git(`(${ICONS.git} ${branch})`));
    }
    parts.push(projectParts.join(' '));


    // --- OUTPUT ---
    const separator = ` ${c.gray(ICONS.sep)} `;
    const outputLine = parts.join(separator);
    
    process.stdout.write(outputLine + ' \n');

  } catch (err) {
    // Quiet failure
  }
}

main();
