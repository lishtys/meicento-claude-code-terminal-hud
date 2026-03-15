#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import pc from 'picocolors';

/**
 * MEICENTO Claude Code Terminal HUD
 * 
 * Inspired by:
 * - OMC (Open Model Context)
 * - rathi-prashant/claude-code-terminal-pro
 * - AndyShaman/claude-statusline
 */

// --- GRUVBOX COLOR PALETTE ---
const GRUVBOX = {
  bg: '#282828',
  fg: '#ebdbb2',
  red: '#fb4934',
  green: '#b8bb26',
  yellow: '#fabd2f',
  blue: '#83a598',
  purple: '#d3869b',
  aqua: '#8ec07c',
  orange: '#fe8019',
  gray: '#928374',
};

// Map color to picocolors if supported, else use hex (some terminals support hex/rgb)
const c = {
  model: (s: string) => pc.bold(pc.blue(s)),
  token: (s: string) => pc.cyan(s),
  dir: (s: string) => pc.magenta(s),
  git: (s: string) => pc.yellow(s),
  time: (s: string) => pc.green(s),
  mcp: (s: string) => pc.red(s),
  gray: (s: string) => pc.gray(s),
  bar_low: (s: string) => pc.green(s),
  bar_mid: (s: string) => pc.yellow(s),
  bar_high: (s: string) => pc.red(s),
};

// --- ICONS ---
const ICONS = {
  model: '󰚩',   // Robot icon
  token: '󰌠',   // Chip icon
  dir: '󰉖',     // Folder icon
  git: '󰊢',     // Branch icon
  time: '󱑎',    // Timer icon
  mcp: '󰒋',     // Server/Connector icon
  sep: '│',
};

// --- HELPERS ---

function getGitBranch(): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function formatValue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function renderProgressBar(percentage: number, length = 20): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  
  let colorFn = c.bar_low;
  if (percentage > 70) colorFn = c.bar_mid;
  if (percentage > 90) colorFn = c.bar_high;

  const barStr = colorFn('█'.repeat(filled)) + c.gray('░'.repeat(empty));
  return `[${barStr}] ${colorFn(percentage.toFixed(0) + '%')}`;
}

// --- MAIN ---

async function main() {
  try {
    // Read stdin (Claude Code pipes data here)
    const rawInput = readFileSync(0, 'utf-8');
    if (!rawInput || rawInput.trim() === '') return;

    let data;
    try {
      data = JSON.parse(rawInput);
    } catch (err) {
      // In case of non-JSON input or partial reads, fail gracefully
      return;
    }

    // --- DATA EXTRACTION ---
    
    // Model Info
    const model = data.model?.display_name || data.model?.id || 'Claude';
    
    // Context & Tokens
    // some schemas use 0-1, others 0-100.
    const rawPercentage = data.context_window?.used_percentage || 0;
    const contextUsage = rawPercentage <= 1 ? rawPercentage * 100 : rawPercentage;
    const totalInput = data.context_window?.total_input_tokens || 0;
    const totalOutput = data.context_window?.total_output_tokens || 0;
    
    // Session Info
    const duration = data.duration || null;
    const mcpCount = data.mcp?.servers_count || 0;
    
    // Environment Info
    const workingDir = path.basename(process.cwd());
    const branch = getGitBranch();

    // --- RENDER PIECES ---
    
    const parts: string[] = [];

    // 1. Model
    parts.push(`${c.model(ICONS.model + ' ' + model)}`);

    // 2. Progress Bar
    parts.push(renderProgressBar(contextUsage));

    // 3. Tokens
    parts.push(`${c.token(ICONS.token + ' ' + formatValue(totalInput) + 'i/' + formatValue(totalOutput) + 'o')}`);

    // 4. Session Time (Optional)
    if (duration) {
      parts.push(`${c.time(ICONS.time + ' ' + duration)}`);
    }

    // 5. MCP (Optional)
    if (mcpCount > 0) {
      parts.push(`${c.mcp(ICONS.mcp + ' ' + mcpCount)}`);
    }

    // 6. Project & Git
    let projectPart = `${c.dir(ICONS.dir + ' ' + workingDir)}`;
    if (branch) {
      projectPart += ` ${c.git('(' + ICONS.git + ' ' + branch + ')')}`;
    }
    parts.push(projectPart);

    // --- OUTPUT ---
    
    const separator = ` ${c.gray(ICONS.sep)} `;
    const outputLine = parts.join(separator);
    
    // Output single line with a trailing space for cleaner look in some shells
    process.stdout.write(outputLine + ' \n');

  } catch (err) {
    // Quiet failure to prevent terminal disruption
  }
}

main();
