#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

// --- CONFIGURATION & THEME (Gruvbox Dark) ---
const COLORS = {
  bg: '\x1b[48;2;40;40;40m', // bg0
  fg: '\x1b[38;2;235;219;178m', // fg0
  red: '\x1b[38;2;251;73;52m',
  green: '\x1b[38;2;184;187;38m',
  yellow: '\x1b[38;2;250;189;47m',
  blue: '\x1b[38;2;131;165;152m',
  purple: '\x1b[38;2;211;134;155m',
  aqua: '\x1b[38;2;142;192;124m',
  gray: '\x1b[38;2;146;131;116m',
  reset: '\x1b[0m',
};

// --- UTILS ---
function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null').toString().trim();
  } catch {
    return null;
  }
}

function getProgressBar(percentage: number, segments = 20) {
  const filledCount = Math.round((percentage / 100) * segments);
  const emptyCount = segments - filledCount;
  
  let color = COLORS.green;
  if (percentage > 70) color = COLORS.yellow;
  if (percentage > 90) color = COLORS.red;

  const bar = color + '█'.repeat(filledCount) + COLORS.gray + '░'.repeat(emptyCount) + COLORS.reset;
  return `[${bar}] ${color}${percentage.toFixed(1)}%${COLORS.reset}`;
}

function formatTokens(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

// --- MAIN ---
async function main() {
  try {
    // Claude Code pipes JSON to stdin
    // For local testing, you can: cat test.json | tsx src/index.ts
    const input = readFileSync(0, 'utf-8');
    if (!input || input.trim() === '') return;

    let data;
    try {
        data = JSON.parse(input);
    } catch (e) {
        return;
    }

    // Extract Data
    const model = data.model?.display_name || 'Claude';
    const contextUsage = (data.context_window?.used_percentage || 0) * 100; // Assuming 0-1 range from JSON
    const inputTokens = data.context_window?.total_input_tokens || 0;
    const outputTokens = data.context_window?.total_output_tokens || 0;
    const workingDir = path.basename(process.cwd());
    const branch = getGitBranch();

    // Build Status Line
    const parts = [
      `${COLORS.blue}󰚩 ${model}${COLORS.reset}`,
      `${getProgressBar(contextUsage)}`,
      `${COLORS.aqua}󰌠 ${formatTokens(inputTokens)}i/${formatTokens(outputTokens)}o${COLORS.reset}`,
      `${COLORS.purple}󰉖 ${workingDir}${COLORS.reset}`,
    ];

    if (branch) {
      parts.push(`${COLORS.yellow}󰊢 ${branch}${COLORS.reset}`);
    }

    // Output single line
    process.stdout.write(parts.join(` ${COLORS.gray}|${COLORS.reset} `) + '
');

  } catch (err) {
    // Fail silently to avoid messing up terminal
  }
}

main();
