# meicento-claude-code-terminal-hud

A 3-line status HUD for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), featuring real-time rate limits, transcript parsing, git status, and configurable display.

Inspired by [claude-hud](https://github.com/jarrodwatts/claude-hud), [claude-ultimate-hud](https://github.com/hadamyeedady12-dev/claude-ultimate-hud), and [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode).

## Output

```
🤖 Opus 4.6 │ █████░░░░░ 52% │ i120K/o15K │ 5h: 9%(3h36m) │ wk: 32%(4d19h)
💭 thinking │ 🎯 commit │ T:42 A:3 S:1 │ ▸ 3/7
📁 my-project git:(main*) │ 3 CLAUDE.md │ 12 rules │ 4 MCPs │ ⏱️ 1h23m
```

**Line 1 (Session):** Model name (cyan) + context bar (green/yellow/red) + token counts + rate limits from OAuth API

**Line 2 (Stats):** Thinking indicator + last skill + tool/agent/skill call counts + todo progress *(only shown when transcript data available)*

**Line 3 (Project):** Directory (yellow) + git branch in oh-my-zsh style (magenta/cyan) + config counts (dim) + session timer

**Optional lines:** Agent activity, permission approval, context warning (at 80%/90%)

## Features

| Feature | Description |
|---------|-------------|
| OAuth Usage API | Rate limits from `api.anthropic.com/api/oauth/usage` with 90s polling, exponential backoff, and stale data fallback |
| Transcript Parsing | JSONL transcript for agents, todos, thinking state, token usage, permissions |
| Config Counter | Counts CLAUDE.md, rules, MCPs (deduplicated across 5 sources), and hooks |
| Git Status | oh-my-zsh style `git:(branch*)` with dirty indicator |
| Color Thresholds | Green (0-50%), Yellow (51-80%), Red (81-100%) using raw ANSI codes |
| Configurable | Toggle any element on/off via `~/.meicento-hud/config.json` |
| Context Warning | Warning at 80%, critical alert at 90% |

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/lishtys/meicento-claude-code-terminal-hud/master/install.sh | bash
```

## Manual Installation

```bash
git clone https://github.com/lishtys/meicento-claude-code-terminal-hud.git ~/.meicento-hud
cd ~/.meicento-hud
npm install && npm run setup
```

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
  index.ts            Entry point (stdin → context → render → stdout)
  types.ts            All TypeScript interfaces
  colors.ts           Raw ANSI escape codes and color helpers
  utils.ts            formatValue, renderBar, formatResetTime
  stdin.ts            Stdin JSON reader
  config.ts           Config loading and validation
  config-counter.ts   CLAUDE.md, rules, MCPs, hooks counting
  usage-api.ts        OAuth API client with caching
  transcript.ts       JSONL transcript parser
  render.ts           3-line compositor
  elements/
    model.ts          🤖 Model display
    context.ts        Progress bar
    tokens.ts         Token counts
    rate-limits.ts    Rate limit display
    session.ts        ⏱️ Session timer
    git.ts            git:(branch*) display
    thinking.ts       💭 Thinking indicator
    call-counts.ts    T:A:S counts
    todos.ts          ▸ Todo progress
    agents.ts         Agent activity lines
    context-warning.ts  ⚠️🔴 Context warning
    permission.ts     ◐ Permission indicator
```

## License

MIT
