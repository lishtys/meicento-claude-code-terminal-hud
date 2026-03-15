# Codemap

## Data Flow

```
stdin (JSON) ──> index.ts ──> render.ts ──> stdout (ANSI)
                   │
                   ├── stdin.ts          Parse input JSON
                   ├── usage-api.ts      OAuth API (rate limits)
                   ├── transcript.ts     JSONL transcript parsing
                   ├── config-counter.ts Count CLAUDE.md/rules/MCPs/hooks
                   ├── config.ts         Load display toggles
                   └── elements/git.ts   Git branch + dirty status
```

All I/O runs in parallel via `Promise.all`. Config toggles gate both rendering and data fetching (e.g., `showGit: false` skips `execFileSync` calls).

## Source Files

### Core

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.ts` | ~59 | Entry point. Reads stdin, runs parallel data fetches, calls render, writes stdout. |
| `src/types.ts` | ~132 | All TypeScript interfaces (`StatuslineStdin`, `HudRenderContext`, `RateLimits`, `TranscriptData`, etc.) |
| `src/render.ts` | ~196 | 3-line compositor. Builds session/stats/project lines + optional activity lines. All elements gated by display config. |

### Input & Config

| File | Lines | Purpose |
|------|-------|---------|
| `src/stdin.ts` | ~31 | Reads fd 0 as JSON. Returns `StatuslineStdin` or null on parse failure. |
| `src/config.ts` | ~95 | Loads `~/.meicento-hud/config.json`. Merges with defaults. Validates boolean fields. |

### Data Sources

| File | Lines | Purpose |
|------|-------|---------|
| `src/usage-api.ts` | ~514 | **Security-critical.** OAuth credential retrieval (macOS Keychain via `execFileSync`, file fallback), token refresh, HTTPS API call to `platform.claude.com/api/oauth/usage`, disk cache with atomic writes. |
| `src/transcript.ts` | ~408 | Parses JSONL transcript. Tail-based reading for files >512KB. Extracts agents, todos, tool/agent/skill counts, token usage, thinking state, pending permissions. |
| `src/config-counter.ts` | ~157 | Counts CLAUDE.md files, rules, MCP servers (deduplicated across project/user/global sources), and hooks. |

### Rendering

| File | Lines | Purpose |
|------|-------|---------|
| `src/colors.ts` | ~71 | Raw ANSI escape codes (cyan, yellow, green, red, magenta, dim, bold, reset). Icon constants. `sep()` helper. No external color library — pipe mode requires raw codes. |
| `src/utils.ts` | ~42 | `formatValue` (K/M formatting), `renderBar` (█░ progress), `formatResetTime` (duration string), `clamp` (0-100). |

### Elements (src/elements/)

Each file exports one or more render functions that return a formatted string or null.

| File | Icon | Output Example | Notes |
|------|------|----------------|-------|
| `model.ts` | 🤖 | `🤖 Opus 4.6` | Parses version from model ID, cyan color |
| `context.ts` | — | `█████░░░░░ 52%` | 10-char bar, color by threshold |
| `tokens.ts` | — | `i90K/o25K r890 s5.6K` | Per-request + session totals |
| `rate-limits.ts` | — | `32%(2h15m) │ 18%(4d19h)` | Percentage colored by threshold, reset in parens. Error states: `[API 429]`, `[API auth]`, `[API err]` |
| `session.ts` | ⏱️ | `⏱️ 1h23m` | Parses duration string from stdin |
| `git.ts` | — | `git:(main*)` | `execSync` with 1s timeout. `*` = dirty |
| `thinking.ts` | 💭 | `💭 thinking` | Active if last thinking block <30s ago |
| `call-counts.ts` | — | `T:42 A:3 S:1` | Tool/Agent/Skill counters, dim |
| `todos.ts` | ▸/✓ | `▸ 3/7` or `✓ 7/7` | Yellow in-progress, green when all done |
| `agents.ts` | ◐/✓ | `◐ planner[Sonnet] (45s)` | Running/completed agents with elapsed time |
| `context-warning.ts` | ⚠️/🔴 | `⚠️ Context 85%` | 80% warning (yellow), 90% critical (red) |
| `permission.ts` | ◐ | `◐ APPROVE? edit: file.ts` | Shown when tool awaiting user approval |

### Setup & Install

| File | Purpose |
|------|---------|
| `scripts/setup.ts` | Reads `~/.claude/settings.json`, adds `statusLine` command pointing to `src/index.ts`. |
| `install.sh` | One-line bash installer. Clones repo, runs npm install, runs setup. |

### Plugin & Commands

| File | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin metadata for Claude Code marketplace |
| `.claude-plugin/marketplace.json` | Marketplace listing configuration |
| `commands/setup.md` | Slash command: `/setup` |
| `commands/configure.md` | Slash command: `/configure` |

## Security Notes

- Keychain access uses `execFileSync` (no shell interpretation)
- Credential file written with mode `0o600`
- Cache directory created with mode `0o700`
- All API traffic over HTTPS to `platform.claude.com`
- Atomic file writes (tmp + rename) prevent corruption
- All external calls have timeouts (API: 10s, git: 1s, keychain: 2s)

## Configuration Toggle Map

Each `display.*` toggle in `~/.meicento-hud/config.json` controls:

| Toggle | Element | Skips Execution |
|--------|---------|-----------------|
| `showTokens` | Token counts on Line 1 | — |
| `showUsage` | Rate limits on Line 1 | Skips OAuth API call |
| `showThinking` | 💭 on Line 2 | — |
| `showSkills` | 🎯 on Line 2 | — |
| `showCallCounts` | T:A:S on Line 2 | — |
| `showTodos` | ▸ on Line 2 | — |
| `showProject` | 📁 + git on Line 3 | — |
| `showGit` | git:(branch*) on Line 3 | Skips git execSync |
| `showConfigCounts` | CLAUDE.md/rules/MCPs/hooks on Line 3 | — |
| `showDuration` | ⏱️ on Line 3 | — |
| `showAgents` | Agent activity lines | — |
| `showContextWarning` | ⚠️/🔴 warning line | — |
| `showPermission` | ◐ APPROVE? line | — |
