/**
 * MEICENTO HUD - Render Compositor
 *
 * Composes parts array, joins with separator.
 * Supports multi-line output (header line + detail lines).
 */
import { c, ICONS } from './colors.js';
import type { HudRenderContext } from './types.js';

import { renderModel } from './elements/model.js';
import { renderContext } from './elements/context.js';
import { renderTokens } from './elements/tokens.js';
import {
  renderRateLimitsWithBar,
  renderRateLimitsError,
  renderRateLimitsFromStdin,
} from './elements/rate-limits.js';
import { renderSession } from './elements/session.js';
import { renderMcp } from './elements/mcp.js';
import { renderGitInfo } from './elements/git.js';
import { renderContextWarning } from './elements/context-warning.js';
import { renderCallCounts } from './elements/call-counts.js';
import { renderThinking } from './elements/thinking.js';
import { renderTodos } from './elements/todos.js';
import { renderAgents } from './elements/agents.js';
import { renderPermission } from './elements/permission.js';

const MAX_OUTPUT_LINES = 3;

export function render(ctx: HudRenderContext): string {
  const separator = ` ${c.gray(ICONS.sep)} `;
  const mainParts: string[] = [];
  const detailParts: string[] = [];

  // --- Main line ---

  // 1. Tag
  mainParts.push(c.tag('[MEI]'));

  // 2. Model (with tier coloring)
  mainParts.push(renderModel(ctx.model, ctx.modelId));

  // 3. Context progress bar
  mainParts.push(renderContext(ctx.contextUsage));

  // 4. Tokens (enhanced with transcript data)
  mainParts.push(renderTokens(
    ctx.totalInput,
    ctx.totalOutput,
    ctx.transcript?.lastRequestTokenUsage,
    ctx.transcript?.sessionTotalTokens,
  ));

  // 5. Rate Limits (API-first, stdin fallback)
  const limitsPart = renderLimits(ctx);
  if (limitsPart) {
    mainParts.push(limitsPart);
  }

  // 6. Session Time (with health coloring)
  if (ctx.duration) {
    mainParts.push(renderSession(ctx.duration, ctx.contextUsage));
  }

  // 7. Thinking indicator
  if (ctx.transcript) {
    const thinking = renderThinking(ctx.transcript.thinkingState);
    if (thinking) mainParts.push(thinking);
  }

  // 8. MCP
  const mcp = renderMcp(ctx.mcpCount);
  if (mcp) mainParts.push(mcp);

  // 9. Call counts
  if (ctx.transcript) {
    const counts = renderCallCounts(
      ctx.transcript.toolCallCount,
      ctx.transcript.agentCallCount,
      ctx.transcript.skillCallCount,
    );
    if (counts) mainParts.push(counts);
  }

  // 10. Project & Git
  mainParts.push(renderGitInfo(ctx.workingDir, ctx.repoName, ctx.branch));

  // --- Detail lines ---

  // Context warning
  const ctxWarning = renderContextWarning(ctx.contextUsage);
  if (ctxWarning) detailParts.push(ctxWarning);

  // Todos
  if (ctx.transcript?.todos.length) {
    const todos = renderTodos(ctx.transcript.todos);
    if (todos) detailParts.push(todos);
  }

  // Active agents
  if (ctx.transcript?.agents.length) {
    const agents = renderAgents(ctx.transcript.agents);
    if (agents) detailParts.push(agents);
  }

  // Permission indicator
  if (ctx.transcript) {
    const perm = renderPermission(ctx.transcript.pendingPermission);
    if (perm) detailParts.push(perm);
  }

  // --- Compose output ---
  const lines: string[] = [];
  lines.push(mainParts.join(separator));

  if (detailParts.length > 0) {
    // Join detail parts on a second line with separator
    lines.push(detailParts.join(separator));
  }

  // Limit output lines
  return lines.slice(0, MAX_OUTPUT_LINES).map(l => l + ' ').join('\n');
}

function renderLimits(ctx: HudRenderContext): string | null {
  // Prefer API data
  if (ctx.usageResult) {
    if (ctx.usageResult.rateLimits) {
      return renderRateLimitsWithBar(ctx.usageResult.rateLimits, ctx.usageResult.stale);
    }
    // Show error indicator if API failed
    const errPart = renderRateLimitsError(ctx.usageResult);
    if (errPart) return errPart;
  }

  // Fallback to stdin rate_limits
  if (ctx.stdinRateLimits) {
    return renderRateLimitsFromStdin(ctx.stdinRateLimits);
  }

  return null;
}
