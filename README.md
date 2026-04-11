# meicento-claude-code-terminal-hud

A multi-line status HUD for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Pure bash + jq, no Node.js required.

Inspired by [cc-statusline](https://github.com/chongdashu/cc-statusline), [claude-hud](https://github.com/jarrodwatts/claude-hud), and [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode).

## Output

```
Opus 4.6 | ◖◗◖◗◖◌◌◌◌◌ 52% | in:320K/out:4.5M | [TEAM]
$49.0 ($16.61/h) | 4.8M tok (27K tpm) | cw:251K cr:4.5M | T:54 | todo:3/5
Agents:4 | Skills:2 | MCP:1
my-project:main* | 2h57m
```

**Line 1 (Session):** Model name, context bar (◖◗ dots with 6-tier color), token counts (in/out), rate limits (subscription only), team mode indicator

**Line 2 (Cost & Stats):** Session cost with burn rate ($/h), total tokens with TPM, cache breakdown (cw/cr), tool count, todo progress

**Line 3 (Agents):** Agent count, skill count, MCP server count *(only shown when non-zero)*

**Line 4 (Project):** Directory:branch with dirty indicator, session duration

## Features

| Feature | Description |
|---------|-------------|
| Native Cost | Reads `cost.total_cost_usd` from Claude Code; fallback to model-aware pricing table |
| Burn Rate | Cost per hour ($/h) and tokens per minute (tpm) |
| Context Bar | 10-cell ◖◗ half-circle dot bar with 6-tier color (green to flashing red) |
| API Mode | Auto-detects `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN`; hides rate limits |
| Team Mode | Detects `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`; shows `[TEAM]` badge |
| Transcript Parsing | JSONL transcript for tool/agent/skill counts, cache tokens, todo progress |
| Transcript Cache | File-size-keyed cache avoids re-parsing unchanged transcripts |
| Git Status | Branch name with dirty indicator (`*`) |
| Token Formatting | Auto-scales: 328 -> `0.3K`, 12000 -> `12K`, 1500000 -> `1.5M` |
| Color Thresholds | Cost: green (<$1) / yellow ($1-5) / red (>$5). Context: 6-tier from green to flashing red |

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

### Requirements

- `bash` (4.0+)
- `jq` (1.6+)
- `git` (optional, for branch display)

## Manual Installation

```bash
git clone https://github.com/lishtys/meicento-claude-code-terminal-hud.git ~/.meicento-hud
```

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.meicento-hud/statusline.sh"
  }
}
```

Restart Claude Code.

## Testing

```bash
echo '{"model":{"id":"claude-opus-4-6"},"context_window":{"used_percentage":52,"total_input_tokens":320000,"total_output_tokens":4500000},"cost":{"total_cost_usd":49.0,"total_duration_ms":10620000},"workspace":{"current_dir":"'$PWD'"}}' | bash statusline.sh
```

## Architecture

```
statusline.sh        Single-file pure bash + jq implementation
install.sh           Cross-platform installer (macOS/Linux/Windows Git Bash)
install.ps1          Windows PowerShell installer
src/                 Legacy TypeScript implementation (v1.x, not used)
```

### Data Flow

```
Claude Code JSON (stdin)
  -> jq: extract fields (model, context, cost, rate_limits, workspace)
  -> bash: environment detection (API mode, team mode)
  -> bash: git info (branch, dirty state)
  -> jq: transcript parsing (tokens, tools, agents, todos) [cached]
  -> bash: cost calculation (native or fallback)
  -> bash: render 4 lines with ANSI colors
  -> stdout
```

### JSON Input Fields

| Field | Source | Usage |
|-------|--------|-------|
| `model.id` | Claude Code | Model name display |
| `context_window.used_percentage` | Claude Code | Context bar fill |
| `context_window.total_input_tokens` | Claude Code | Token count (in) |
| `context_window.total_output_tokens` | Claude Code | Token count (out) |
| `cost.total_cost_usd` | Claude Code | Session cost |
| `cost.total_duration_ms` | Claude Code | Burn rate + TPM |
| `rate_limits.*` | Claude Code | Subscription rate limits |
| `transcript_path` | Claude Code | Transcript file for parsing |
| `workspace.current_dir` | Claude Code | Git branch detection |

## License

MIT
