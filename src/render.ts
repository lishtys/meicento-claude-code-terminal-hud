/**
 * MEICENTO HUD - 3-Line Render Compositor
 *
 * Line 1 (Session):  🤖 Opus 4 │ ██████████░░░░░░░░░░ 45% │ i90K/o25K │ 5h: 32%(2h15m) wk: 18%(4d19h)
 * Line 2 (Stats):    💭 thinking │ 🎯 commit │ T:42 A:3 S:1 │ ▸ 3/7
 * Line 3 (Project):  📁 my-project git:(main*) │ 3 CLAUDE.md │ 12 rules │ 4 MCPs │ ⏱️ 1h23m
 * Optional:          Activity lines (agents, permission, context warning)
 *
 * All elements respect display config toggles.
 */
import { C, ICONS, sep } from './colors.js';
import type { HudRenderContext } from './types.js';

import { renderModel } from './elements/model.js';
import { renderContext } from './elements/context.js';
import { renderTokens } from './elements/tokens.js';
import { renderRateLimitsApi, renderRateLimitsError, renderRateLimitsStdin } from './elements/rate-limits.js';
import { renderSession } from './elements/session.js';
import { renderGit } from './elements/git.js';
import { renderThinking } from './elements/thinking.js';
import { renderCallCounts } from './elements/call-counts.js';
import { renderTodos } from './elements/todos.js';
import { renderAgentLines } from './elements/agents.js';
import { renderContextWarning } from './elements/context-warning.js';
import { renderPermission } from './elements/permission.js';

export function render(ctx: HudRenderContext): string {
  const lines: string[] = [];

  lines.push(buildSessionLine(ctx));

  const statsLine = buildStatsLine(ctx);
  if (statsLine) lines.push(statsLine);

  const projectLine = buildProjectLine(ctx);
  if (projectLine) lines.push(projectLine);

  const extras = buildActivityLines(ctx);
  lines.push(...extras);

  return lines.join('\n');
}

// ── Line 1: Session (always shown) ──────────────────────────

function buildSessionLine(ctx: HudRenderContext): string {
  const parts: string[] = [];
  const d = ctx.display;

  // Model (always shown)
  parts.push(renderModel(ctx.model, ctx.modelId));

  // Context bar (always shown)
  parts.push(renderContext(ctx.contextUsage));

  // Tokens
  if (d.showTokens) {
    parts.push(renderTokens(
      ctx.totalInput,
      ctx.totalOutput,
      ctx.transcript?.lastRequestTokenUsage,
      ctx.transcript?.sessionTotalTokens,
    ));
  }

  // Rate limits
  if (d.showUsage) {
    const limits = buildLimits(ctx);
    if (limits) parts.push(limits);
  }

  return parts.join(sep());
}

// ── Line 2: Stats (only if transcript data and any element enabled) ──

function buildStatsLine(ctx: HudRenderContext): string | null {
  const t = ctx.transcript;
  if (!t) return null;

  const d = ctx.display;
  const parts: string[] = [];

  if (d.showThinking) {
    const thinking = renderThinking(t.thinkingState);
    if (thinking) parts.push(thinking);
  }

  if (d.showSkills && t.lastActivatedSkill) {
    parts.push(`${ICONS.skill} ${C.cyan(t.lastActivatedSkill.name)}`);
  }

  if (d.showCallCounts) {
    const counts = renderCallCounts(t.toolCallCount, t.agentCallCount, t.skillCallCount);
    if (counts) parts.push(counts);
  }

  if (d.showTodos) {
    const todos = renderTodos(t.todos);
    if (todos) parts.push(todos);
  }

  if (parts.length === 0) return null;
  return parts.join(sep());
}

// ── Line 3: Project ──────────────────────────────────────────

function buildProjectLine(ctx: HudRenderContext): string | null {
  const d = ctx.display;

  // If project display is off, skip entire line
  if (!d.showProject && !d.showDuration) return null;

  const parts: string[] = [];

  // Directory + git
  if (d.showProject) {
    const dirPart = `${ICONS.folder} ${C.yellow(ctx.workingDir)}`;
    if (d.showGit) {
      const gitPart = renderGit(ctx.branch, ctx.gitDirty);
      parts.push(gitPart ? `${dirPart} ${gitPart}` : dirPart);
    } else {
      parts.push(dirPart);
    }
  }

  // Config counts
  if (d.showConfigCounts && ctx.configCounts) {
    const cc = ctx.configCounts;
    const cfgParts: string[] = [];
    if (cc.claudeMd > 0) cfgParts.push(`${cc.claudeMd} CLAUDE.md`);
    if (cc.rules > 0) cfgParts.push(`${cc.rules} rules`);
    if (cc.mcps > 0) cfgParts.push(`${cc.mcps} MCPs`);
    if (cc.hooks > 0) cfgParts.push(`${cc.hooks} hooks`);
    if (cfgParts.length > 0) {
      parts.push(C.dim(cfgParts.join(' │ ')));
    }
  }

  // Session timer
  if (d.showDuration && ctx.duration) {
    parts.push(renderSession(ctx.duration));
  }

  if (parts.length === 0) return null;
  return parts.join(sep());
}

// ── Optional Activity Lines ──────────────────────────────────

function buildActivityLines(ctx: HudRenderContext): string[] {
  const lines: string[] = [];
  const d = ctx.display;

  // Agent activity
  if (d.showAgents && ctx.transcript?.agents.length) {
    lines.push(...renderAgentLines(ctx.transcript.agents));
  }

  // Permission pending
  if (d.showPermission && ctx.transcript?.pendingPermission) {
    const perm = renderPermission(ctx.transcript.pendingPermission);
    if (perm) lines.push(perm);
  }

  // Context warning
  if (d.showContextWarning) {
    const warning = renderContextWarning(ctx.contextUsage);
    if (warning) lines.push(warning);
  }

  return lines;
}

// ── Helpers ──────────────────────────────────────────────────

function buildLimits(ctx: HudRenderContext): string | null {
  // API data available and successful
  if (ctx.usageResult?.rateLimits) {
    return renderRateLimitsApi(ctx.usageResult.rateLimits, ctx.usageResult.stale);
  }

  // API failed — fall back to stdin rate limits if available
  if (ctx.stdinRateLimits) {
    return renderRateLimitsStdin(ctx.stdinRateLimits);
  }

  // No stdin fallback — show API error indicator
  if (ctx.usageResult) {
    return renderRateLimitsError(ctx.usageResult);
  }

  return null;
}
