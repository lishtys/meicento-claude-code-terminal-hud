/**
 * Git Element: git:(main*) oh-my-zsh style
 */
import { execSync } from 'node:child_process';
import { C } from '../colors.js';

export function getGitBranch(cwd?: string): string | null {
  try {
    return execSync('git branch --show-current', {
      cwd,
      encoding: 'utf-8',
      timeout: 1000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || null;
  } catch {
    return null;
  }
}

export function isGitDirty(cwd?: string): boolean {
  try {
    const out = execSync('git status --porcelain', {
      cwd,
      encoding: 'utf-8',
      timeout: 1000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

export function renderGit(branch: string | null, dirty: boolean): string | null {
  if (!branch) return null;
  const branchStr = dirty ? `${branch}*` : branch;
  return `${C.magenta('git:(')}${C.cyan(branchStr)}${C.magenta(')')}`;
}
