# Contributing

## Development Setup

```bash
git clone https://github.com/lishtys/meicento-claude-code-terminal-hud.git
cd meicento-claude-code-terminal-hud
npm install
```

## Available Scripts

| Script | Command | Use When |
|--------|---------|----------|
| `npm start` | `tsx src/index.ts` | Run HUD manually (pipe JSON to stdin) |
| `npm run dev` | `tsx watch src/index.ts` | Auto-reload during development |
| `npm run build` | `tsc` | Compile TypeScript — run before committing |
| `npm run setup` | `npx tsx scripts/setup.ts` | Write statusLine config to `~/.claude/settings.json` |

## Testing Locally

Pipe mock JSON to stdin:

```bash
echo '{"model":{"id":"claude-sonnet-4-20250514"},"context_window":{"used_percentage":65,"total_input_tokens":100000,"total_output_tokens":12000},"duration":"45m","mcp":{"servers_count":3}}' | npx tsx src/index.ts
```

Verify ANSI color codes are present (important — `picocolors` was replaced with raw ANSI because statusline runs in pipe mode):

```bash
echo '{"model":{"id":"claude-opus-4-6"},"context_window":{"used_percentage":50}}' | npx tsx src/index.ts | cat -v
# Should show ^[[36m (cyan), ^[[33m (yellow), ^[[32m (green), etc.
```

Test with high context (triggers warning):

```bash
echo '{"model":{"id":"claude-opus-4-6"},"context_window":{"used_percentage":92}}' | npx tsx src/index.ts
# Should show 🔴 Context 92% - /compact recommended!
```

## Project Structure

- `src/index.ts` — Entry point: read stdin, fetch data in parallel, render, write stdout
- `src/colors.ts` — Raw ANSI codes (NOT picocolors — colors must work in pipe mode)
- `src/render.ts` — 3-line compositor, respects `display` config toggles
- `src/elements/` — One file per HUD element, each exports a render function
- `src/usage-api.ts` — OAuth API with Keychain auth, token refresh, 90s polling, backoff
- `src/transcript.ts` — JSONL parser with tail-based reading for large files
- `src/config.ts` — Config loading from `~/.meicento-hud/config.json`
- `src/config-counter.ts` — Counts CLAUDE.md, rules, MCPs (deduplicated), hooks
- `commands/` — Slash commands for Claude Code (`setup.md`, `configure.md`)
- `.claude-plugin/` — Plugin metadata for marketplace

## Key Design Decisions

1. **Raw ANSI codes, not picocolors** — `process.stdout.isTTY` is `undefined` in pipe mode, so picocolors strips all colors. Both claude-hud and claude-ultimate-hud use raw ANSI for this reason.

2. **API-first, stdin fallback** — Rate limits come from OAuth API (90s poll). If API fails (429/auth/network), falls back to `rate_limits` from stdin JSON.

3. **Cache outside install dir** — Usage API cache at `~/.cache/meicento-hud/` survives reinstalls. Config at `~/.meicento-hud/config.json`.

4. **Parallel I/O** — `Promise.all([getUsage(), parseTranscript(), countConfig()])` runs all data fetching concurrently.

5. **Config toggles skip work** — If `showGit: false`, git commands are not executed. If `showUsage: false`, API is not called.

## Commit Convention

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`
