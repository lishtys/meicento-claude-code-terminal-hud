# meicento-claude-code-terminal-hud

A 3-line status HUD for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), featuring real-time rate limits, transcript parsing, git status, and configurable display.

Inspired by [claude-hud](https://github.com/jarrodwatts/claude-hud), [claude-ultimate-hud](https://github.com/hadamyeedady12-dev/claude-ultimate-hud), and [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode).

## Output

```
🤖 Opus 4.6 │ █████░░░░░ 52% │ i120K/o15K │ 9%(3h36m) │ 32%(4d19h)
💭 thinking │ 🎯 commit │ T:42 A:3 S:1 │ ▸ 3/7
📁 my-project git:(main*) │ 3 CLAUDE.md │ 12 rules │ 4 MCPs │ ⏱️ 1h23m
```

**Line 1 (Session):** Model name + context bar + token counts + rate limits from OAuth API

**Line 2 (Stats):** Thinking indicator + last skill + tool/agent/skill call counts + todo progress *(only shown when transcript data available)*

**Line 3 (Project):** Directory + git branch in oh-my-zsh style + config counts + session timer

**Optional lines:** Agent activity, permission approval, context warning (at 80%/90%)

## Icons & Symbols Reference

| Symbol | Name | Meaning |
|--------|------|---------|
| 🤖 | Model | Claude model name and version (cyan) |
| 📁 | Folder | Current working directory (yellow) |
| ⏱️ | Timer | Session elapsed time (dim) |
| 💭 | Thinking | Extended thinking is active (magenta) |
| 🎯 | Skill | Last activated skill name (cyan) |
| ⚠️ | Warning | Context usage reached 80% (yellow) |
| 🔴 | Critical | Context usage reached 90% (red) |
| ◐ | Running | Agent or task currently running (yellow) |
| ✓ | Completed | Task or agent completed (green) |
| ▸ | Todo | Todo progress indicator (yellow) |
| █ | Filled | Used portion of context bar |
| ░ | Empty | Available portion of context bar |
| `*` | Dirty | Uncommitted git changes, shown after branch name |
| `│` | Separator | Divides HUD elements (dim) |

### Token Abbreviations

| Prefix | Meaning | Example |
|--------|---------|---------|
| `i` | Input tokens | `i90K` |
| `o` | Output tokens | `o25K` |
| `r` | Reasoning tokens | `r890` |
| `s` | Session total | `s5.6K` |

### Call Count Abbreviations

| Prefix | Meaning | Example |
|--------|---------|---------|
| `T` | Tool calls | `T:42` |
| `A` | Agent calls | `A:3` |
| `S` | Skill calls | `S:1` |

### Rate Limit Format

Rate limits are displayed as `percentage(reset_time)`. The 5-hour limit comes first, followed by weekly. Color indicates severity:
- **Green** (0-50%) — safe
- **Yellow** (51-80%) — caution
- **Red** (81-100%) — critical
- `*` suffix — data is stale (cached)

Error indicators: `[API 429]` (rate limited), `[API auth]` (auth error), `[API err]` (other error)

### Context Warning

| Threshold | Display |
|-----------|---------|
| 80%+ | `⚠️ Context 85% - consider /compact` |
| 90%+ | `🔴 Context 95% - /compact recommended!` |

### Permission Approval

When Claude Code is waiting for user permission:
```
◐ APPROVE? edit: filename.ts
```

### Agent Activity

Running and completed agents appear on extra lines:
```
◐ planner[Sonnet]: Analyze architecture (45s)
✓ code-reviewer[Haiku]: Review changes (12s)
```

## Features

| Feature | Description |
|---------|-------------|
| OAuth Usage API | Rate limits from `platform.claude.com/api/oauth/usage` with 90s polling, exponential backoff, and stale data fallback |
| Transcript Parsing | JSONL transcript for agents, todos, thinking state, token usage, permissions |
| Config Counter | Counts CLAUDE.md, rules, MCPs (deduplicated across 5 sources), and hooks |
| Git Status | oh-my-zsh style `git:(branch*)` with dirty indicator |
| Color Thresholds | Green (0-50%), Yellow (51-80%), Red (81-100%) using raw ANSI codes |
| Configurable | Toggle any element on/off via `~/.meicento-hud/config.json` |
| Context Warning | Warning at 80%, critical alert at 90% |

## Quick Start

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/lishtys/meicento-claude-code-terminal-hud/master/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/lishtys/meicento-claude-code-terminal-hud/master/install.ps1 | iex
```

### Windows (Git Bash)

```bash
curl -fsSL https://raw.githubusercontent.com/lishtys/meicento-claude-code-terminal-hud/master/install.sh | bash
```

## Manual Installation

```bash
git clone https://github.com/lishtys/meicento-claude-code-terminal-hud.git ~/.meicento-hud
cd ~/.meicento-hud
npm install && npm run setup
```

> **Note:** The setup script auto-detects your platform and generates the correct `statusLine` command with POSIX-style paths for cross-platform compatibility.

## Configuration

Config file: `~/.meicento-hud/config.json`

```json
{
  "display": {
    "showTokens": true,
    "showUsage": true,
    "showThinking": true,
    "showSkills": true,
    "showCallCounts": true,
    "showTodos": true,
    "showProject": true,
    "showGit": true,
    "showConfigCounts": true,
    "showDuration": true,
    "showAgents": true,
    "showContextWarning": true,
    "showPermission": true
  },
  "gitStatus": {
    "showDirty": true
  }
}
```

Only write keys you want to change. All default to `true`.

## Testing

```bash
echo '{"model":{"id":"claude-sonnet-4-20250514"},"context_window":{"used_percentage":50,"total_input_tokens":50000,"total_output_tokens":5000},"duration":"30m","mcp":{"servers_count":2}}' | npx tsx src/index.ts
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `tsx src/index.ts` | Run HUD (reads JSON from stdin) |
| `dev` | `tsx watch src/index.ts` | Watch mode for development |
| `build` | `tsc` | Compile TypeScript to dist/ |
| `setup` | `npx tsx scripts/setup.ts` | Configure Claude Code statusLine |

## Architecture

```
src/
  index.ts            Entry point (stdin -> context -> render -> stdout)
  types.ts            All TypeScript interfaces
  colors.ts           Raw ANSI escape codes, icon definitions, color helpers
  utils.ts            formatValue, renderBar, formatResetTime, clamp
  stdin.ts            Stdin JSON reader
  config.ts           Config loading and validation (~/.meicento-hud/config.json)
  config-counter.ts   CLAUDE.md, rules, MCPs, hooks counting
  usage-api.ts        OAuth API client with keychain auth, token refresh, caching
  transcript.ts       JSONL transcript parser (tail-based for large files)
  render.ts           3-line compositor with display config toggles
  elements/
    model.ts          🤖 Model name with version parsing
    context.ts        █░ Context usage progress bar
    tokens.ts         i/o/r/s Token counts with K/M formatting
    rate-limits.ts    Rate limit percentages with reset times
    session.ts        ⏱️ Session elapsed timer
    git.ts            git:(branch*) oh-my-zsh style display
    thinking.ts       💭 Extended thinking indicator
    call-counts.ts    T:A:S Tool/agent/skill call counters
    todos.ts          ▸/✓ Todo progress display
    agents.ts         ◐/✓ Agent activity lines with elapsed time
    context-warning.ts  ⚠️/🔴 Context usage warning (80%/90%)
    permission.ts     ◐ APPROVE? Permission approval indicator
```

## License

MIT
