/**
 * MEICENTO HUD - Config Counter
 *
 * Counts CLAUDE.md files, rules, MCP servers (deduplicated), and hooks.
 * MCP counting scans all known config locations rather than relying on stdin.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ConfigCounts } from './types.js';

export function countConfig(mcpFromStdin: number): ConfigCounts {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || join(homeDir, '.claude');
  const cwd = process.cwd();

  return {
    claudeMd: countClaudeMd(claudeDir, cwd),
    rules: countRules(claudeDir, cwd),
    mcps: countMcps(claudeDir, homeDir, cwd, mcpFromStdin),
    hooks: countHooks(claudeDir, cwd),
  };
}

// ── CLAUDE.md ────────────────────────────────────────────────

function countClaudeMd(claudeDir: string, cwd: string): number {
  const counted = new Set<string>();
  const check = (p: string): void => {
    try {
      if (existsSync(p)) {
        const real = resolve(p);
        if (!counted.has(real)) counted.add(real);
      }
    } catch { /* ignore */ }
  };

  // User-level
  check(join(claudeDir, 'CLAUDE.md'));

  // Project-level
  check(join(cwd, 'CLAUDE.md'));
  check(join(cwd, 'CLAUDE.local.md'));
  check(join(cwd, '.claude', 'CLAUDE.md'));
  check(join(cwd, '.claude', 'CLAUDE.local.md'));

  // Parent directories (up to 3 levels)
  let dir = cwd;
  for (let i = 0; i < 3; i++) {
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
    check(join(dir, 'CLAUDE.md'));
  }

  return counted.size;
}

// ── Rules ────────────────────────────────────────────────────

function countRules(claudeDir: string, cwd: string): number {
  let count = 0;
  count += countFilesRecursive(join(claudeDir, 'rules'));
  count += countFilesRecursive(join(cwd, '.claude', 'rules'));
  return count;
}

// ── MCPs (deduplicated across all sources) ───────────────────

function countMcps(claudeDir: string, homeDir: string, cwd: string, stdinCount: number): number {
  const allServers = new Set<string>();

  // Use stdin count as baseline if no config sources found
  const sources = [
    join(claudeDir, 'settings.json'),
    join(homeDir, '.claude.json'),
    join(cwd, '.mcp.json'),
    join(cwd, '.claude', 'settings.json'),
    join(cwd, '.claude', 'settings.local.json'),
  ];

  for (const src of sources) {
    for (const name of getMcpServerNames(src)) {
      allServers.add(name);
    }
  }

  // Project-scoped MCPs from ~/.claude.json
  const claudeJson = join(homeDir, '.claude.json');
  for (const name of getProjectScopedMcps(claudeJson, cwd)) {
    allServers.add(name);
  }

  // Return the higher of file-based count and stdin count
  return Math.max(allServers.size, stdinCount);
}

function getMcpServerNames(filePath: string): string[] {
  try {
    if (!existsSync(filePath)) return [];
    const config = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (config?.mcpServers && typeof config.mcpServers === 'object') {
      return Object.keys(config.mcpServers);
    }
  } catch { /* ignore */ }
  return [];
}

function getProjectScopedMcps(claudeJsonPath: string, cwd: string): string[] {
  try {
    if (!existsSync(claudeJsonPath)) return [];
    const config = JSON.parse(readFileSync(claudeJsonPath, 'utf-8'));
    const projects = config?.projects as Record<string, Record<string, unknown>> | undefined;
    if (!projects) return [];
    const proj = projects[cwd];
    if (proj?.mcpServers && typeof proj.mcpServers === 'object') {
      return Object.keys(proj.mcpServers as Record<string, unknown>);
    }
  } catch { /* ignore */ }
  return [];
}

// ── Hooks ────────────────────────────────────────────────────

function countHooks(claudeDir: string, cwd: string): number {
  let count = 0;
  count += countHooksInFile(join(claudeDir, 'settings.json'));
  count += countHooksInFile(join(cwd, '.claude', 'settings.json'));
  count += countHooksInFile(join(cwd, '.claude', 'settings.local.json'));
  return count;
}

function countHooksInFile(filePath: string): number {
  try {
    if (!existsSync(filePath)) return 0;
    const config = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (!config?.hooks || typeof config.hooks !== 'object') return 0;
    return Object.keys(config.hooks).length;
  } catch {
    return 0;
  }
}

// ── Helpers ──────────────────────────────────────────────────

function countFilesRecursive(dir: string, depth = 0): number {
  if (!existsSync(dir) || depth > 10) return 0;
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isFile()) count++;
      else if (entry.isDirectory()) count += countFilesRecursive(join(dir, entry.name), depth + 1);
    }
  } catch { /* ignore */ }
  return count;
}
