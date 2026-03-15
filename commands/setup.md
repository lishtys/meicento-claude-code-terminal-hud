---
description: Configure meicento-hud as your Claude Code statusline
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion
---

# Meicento HUD Setup

Configure the meicento-hud status line with automatic runtime detection.

## Step 1: Detect Installation

Check if meicento-hud is installed:

```bash
ls -d ~/.meicento-hud/src/index.ts 2>/dev/null && echo "INSTALLED" || echo "NOT_INSTALLED"
```

**If NOT_INSTALLED**: Tell user to install first:
```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/lishtys/meicento-claude-code-terminal-hud/master/install.sh)"
```

## Step 2: Detect Runtime

Find the best available runtime (prefer bun for speed, fallback to node):

**macOS/Linux**:
```bash
RUNTIME=$(command -v bun 2>/dev/null || command -v node 2>/dev/null)
echo "Runtime: $RUNTIME"
```

If empty, tell user to install Node.js or Bun.

Determine source file:
- If runtime is `bun`: use `src/index.ts` (native TS support)
- If runtime is `node` via `npx tsx`: use `/usr/bin/env npx tsx ~/.meicento-hud/src/index.ts`

## Step 3: Generate and Test Command

Generate the statusline command:
- Bun: `bun ~/.meicento-hud/src/index.ts`
- Node (tsx): `/usr/bin/env npx tsx ~/.meicento-hud/src/index.ts`

Test the command:
```bash
echo '{"model":{"id":"claude-sonnet-4-20250514"},"context_window":{"used_percentage":50}}' | {GENERATED_COMMAND} 2>&1
```

If output looks correct (contains 🤖 and progress bar), proceed. If error, debug.

## Step 4: Apply Configuration

Read `~/.claude/settings.json`. Merge the statusLine config, preserving all existing settings:

```json
{
  "statusLine": {
    "type": "command",
    "command": "{GENERATED_COMMAND}"
  }
}
```

If file doesn't exist, create it. If invalid JSON, report error.

## Step 5: Optional Features

Ask user if they'd like to configure display features:

Use AskUserQuestion:
- header: "Display Features"
- question: "Enable or disable any HUD features? (all enabled by default)"
- multiSelect: true
- options:
  - "Tools & call counts" -- T:42 A:3 S:1
  - "Agents activity" -- Running/completed agent lines
  - "Todo progress" -- ▸ 3/7
  - "Thinking indicator" -- 💭 thinking
  - "Config counts" -- CLAUDE.md, rules, MCPs, hooks
  - "Context warning" -- ⚠️ at 80%, 🔴 at 90%
  - "Keep defaults (all on)" -- Skip configuration

**If user selects "Keep defaults"** or cancels: do not create config file.

**Otherwise**: Write `~/.meicento-hud/config.json` with only the deselected items set to `false`:

```json
{
  "display": {
    "showCallCounts": false,
    "showAgents": false
  }
}
```

Only write keys for features the user wants to DISABLE. Default is all enabled.

## Step 6: Verify

Tell user: "Setup complete! Restart Claude Code to see the HUD."

Show expected output format:
```
🤖 Sonnet 4 │ █████░░░░░ 50% │ i5.0K/o500 │ 5h: 12%(3h42m) wk: 18%(4d19h)
💭 thinking │ 🎯 commit │ T:42 A:3 S:1 │ ▸ 3/7
📁 my-project git:(main*) │ 3 CLAUDE.md │ 12 rules │ 4 MCPs │ ⏱️ 1h23m
```
