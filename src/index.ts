#!/usr/bin/env tsx
/**
 * MEICENTO Claude Code Terminal HUD
 *
 * 3-line status display inspired by:
 * - jarrodwatts/claude-hud
 * - hadamyeedady12-dev/claude-ultimate-hud
 */
import * as path from 'node:path';
import { readStdin, getContextPercent, getModelName, getModelId } from './stdin.js';
import { getUsage } from './usage-api.js';
import { parseTranscript } from './transcript.js';
import { countConfig } from './config-counter.js';
import { loadConfig } from './config.js';
import { render } from './render.js';
import { getGitBranch, isGitDirty } from './elements/git.js';
import type { HudRenderContext } from './types.js';

async function main(): Promise<void> {
  try {
    const data = readStdin();
    if (!data) return;

    const mcpCount = data.mcp?.servers_count || 0;
    const config = loadConfig();

    const [usageResult, transcript, configCounts] = await Promise.all([
      config.display.showUsage ? getUsage().catch(() => undefined) : Promise.resolve(undefined),
      parseTranscript(data.transcript_path).catch(() => undefined),
      Promise.resolve(countConfig(mcpCount)),
    ]);

    const ctx: HudRenderContext = {
      model: getModelName(data),
      modelId: getModelId(data),
      contextUsage: getContextPercent(data),
      totalInput: data.context_window?.total_input_tokens || 0,
      totalOutput: data.context_window?.total_output_tokens || 0,
      duration: data.duration || null,
      mcpCount,
      workingDir: path.basename(process.cwd()),
      repoName: null,
      branch: config.display.showGit ? getGitBranch() : null,
      gitDirty: config.display.showGit && config.gitStatus.showDirty ? isGitDirty() : false,
      usageResult,
      stdinRateLimits: data.rate_limits,
      transcript,
      configCounts,
      display: config.display,
    };

    process.stdout.write(render(ctx) + '\n');
  } catch {
    // Quiet failure
  }
}

main();
