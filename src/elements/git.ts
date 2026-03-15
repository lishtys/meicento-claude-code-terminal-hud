/**
 * MEICENTO HUD - Git Info Element
 */
import { execSync } from 'node:child_process';
import { c, ICONS } from '../colors.js';

export function getGitRepoName(cwd?: string): string | null {
  try {
    const url = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      timeout: 1000,
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
    }).trim();

    if (!url) return null;

    const match = url.match(/\/([^/]+?)(?:\.git)?$/) || url.match(/:([^/]+?)(?:\.git)?$/);
    return match ? match[1].replace(/\.git$/, '') : null;
  } catch {
    return null;
  }
}

export function getGitBranch(cwd?: string): string | null {
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

export function renderGitInfo(
  workingDir: string,
  repoName: string | null,
  branch: string | null,
): string {
  const parts: string[] = [];
  parts.push(c.dir(`${ICONS.dir} ${workingDir}`));

  if (repoName) {
    parts.push(c.repo(`(${ICONS.repo} ${repoName})`));
  }
  if (branch) {
    parts.push(c.git(`(${ICONS.git} ${branch})`));
  }
  return parts.join(' ');
}
