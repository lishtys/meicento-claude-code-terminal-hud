/**
 * MEICENTO HUD - Config Counter
 *
 * Counts CLAUDE.md files, rules, MCPs, and hooks.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ConfigCounts } from './types.js';

export function countConfig(mcpFromStdin: number): ConfigCounts {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || join(homeDir, '.claude');
  const cwd = process.cwd();

  return {
    claudeMd: countClaudeMd(cwd),
    rules: countRules(claudeDir, cwd),
    mcps: mcpFromStdin,
    hooks: countHooks(claudeDir),
  };
}

function countClaudeMd(cwd: string): number {
  let count = 0;
  try {
    // Current dir
    if (existsSync(join(cwd, 'CLAUDE.md'))) count++;
    // .claude/ subdir
    if (existsSync(join(cwd, '.claude', 'CLAUDE.md'))) count++;
    // Walk up to 3 parent levels
    let dir = cwd;
    for (let i = 0; i < 3; i++) {
      const parent = resolve(dir, '..');
      if (parent === dir) break;
      dir = parent;
      if (existsSync(join(dir, 'CLAUDE.md'))) count++;
    }
  } catch { /* ignore */ }
  return count;
}

function countRules(claudeDir: string, cwd: string): number {
  let count = 0;
  try {
    count += countFilesRecursive(join(claudeDir, 'rules'));
  } catch { /* ignore */ }
  try {
    count += countFilesRecursive(join(cwd, '.claude', 'rules'));
  } catch { /* ignore */ }
  return count;
}

function countHooks(claudeDir: string): number {
  try {
    const settingsPath = join(claudeDir, 'settings.json');
    if (!existsSync(settingsPath)) return 0;
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    if (!settings.hooks) return 0;
    return Object.values(settings.hooks).reduce<number>((sum, arr) => {
      return sum + (Array.isArray(arr) ? arr.length : 0);
    }, 0);
  } catch {
    return 0;
  }
}

function countFilesRecursive(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isFile()) count++;
      else if (entry.isDirectory()) count += countFilesRecursive(join(dir, entry.name));
    }
  } catch { /* ignore */ }
  return count;
}
