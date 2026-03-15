#!/usr/bin/env tsx
/**
 * MEICENTO Claude Code Terminal HUD
 *
 * Inspired by:
 * - OMC (oh-my-claudecode)
 * - rathi-prashant/claude-code-terminal-pro
 * - AndyShaman/claude-statusline
 */
import * as path from 'node:path';
import { readStdin, getContextPercent, getModelName, getModelId } from './stdin.js';
import { getUsage } from './usage-api.js';
import { parseTranscript } from './transcript.js';
import { render } from './render.js';
import { getGitRepoName, getGitBranch } from './elements/git.js';
import type { HudRenderContext } from './types.js';

async function main(): Promise<void> {
  try {
    const data = readStdin();
    if (!data) return;

    // Parallel async work: usage API + transcript parsing
    const [usageResult, transcript] = await Promise.all([
      getUsage().catch(() => undefined),
      parseTranscript(data.transcript_path).catch(() => undefined),
    ]);

    const ctx: HudRenderContext = {
      model: getModelName(data),
      modelId: getModelId(data),
      contextUsage: getContextPercent(data),
      totalInput: data.context_window?.total_input_tokens || 0,
      totalOutput: data.context_window?.total_output_tokens || 0,
      duration: data.duration || null,
      mcpCount: data.mcp?.servers_count || 0,
      workingDir: path.basename(process.cwd()),
      repoName: getGitRepoName(),
      branch: getGitBranch(),
      usageResult,
      stdinRateLimits: data.rate_limits,
      transcript,
    };

    process.stdout.write(render(ctx) + '\n');
  } catch {
    // Quiet failure
  }
}

main();
