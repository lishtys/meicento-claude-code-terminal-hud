---
description: Configure meicento-hud display options (toggle elements, git style)
allowed-tools: Read, Write, AskUserQuestion
---

# Configure Meicento HUD

Interactively configure which HUD elements to show or hide.

**FIRST**: Read `~/.meicento-hud/config.json` if it exists. Note current values.

## Config Location

`~/.meicento-hud/config.json`

## Two Flows

### Flow A: No config file exists (first-time configuration)
Questions: **Preset -> Turn Off -> Git Style**

### Flow B: Config file exists (update)
Questions: **Turn Off -> Turn On -> Git Style**

---

## Flow A: New Configuration

### Q1: Preset
Use AskUserQuestion:
- header: "Preset"
- question: "Choose a starting configuration:"
- options:
  - "Full (Recommended)" -- Everything enabled
  - "Essential" -- Session line + project line only (no stats line)
  - "Minimal" -- Model + context bar only

### Q2: Turn Off (based on preset)
Use AskUserQuestion:
- header: "Turn Off"
- question: "Disable any of these? (enabled by your preset)"
- multiSelect: true
- options: **ONLY items that are ON in the chosen preset**

| Element | Config Key | Full | Essential | Minimal |
|---------|-----------|------|-----------|---------|
| Token counts | `display.showTokens` | ON | ON | OFF |
| Rate limits | `display.showUsage` | ON | ON | OFF |
| Thinking indicator | `display.showThinking` | ON | OFF | OFF |
| Skill tracking | `display.showSkills` | ON | OFF | OFF |
| Call counts (T/A/S) | `display.showCallCounts` | ON | OFF | OFF |
| Todo progress | `display.showTodos` | ON | OFF | OFF |
| Project directory | `display.showProject` | ON | ON | OFF |
| Git branch | `display.showGit` | ON | ON | OFF |
| Config counts | `display.showConfigCounts` | ON | ON | OFF |
| Session duration | `display.showDuration` | ON | ON | OFF |
| Agent activity | `display.showAgents` | ON | OFF | OFF |
| Context warning | `display.showContextWarning` | ON | ON | OFF |
| Permission indicator | `display.showPermission` | ON | ON | OFF |

### Q3: Git Style
Use AskUserQuestion:
- header: "Git Style"
- question: "Show dirty indicator (*) on git branch?"
- options:
  - "Yes - git:(main*)" -- Shows uncommitted changes
  - "No - git:(main)" -- Branch name only

---

## Flow B: Update Configuration

### Q1: Turn Off
Use AskUserQuestion:
- header: "Turn Off"
- question: "What do you want to DISABLE? (currently enabled)"
- multiSelect: true
- options: **ONLY items currently ON** (from existing config, max 8)

### Q2: Turn On
Use AskUserQuestion:
- header: "Turn On"
- question: "What do you want to ENABLE? (currently disabled)"
- multiSelect: true
- options: **ONLY items currently OFF** (from existing config)

### Q3: Git Style
Same as Flow A Q3.

---

## Write Configuration

Before writing, show preview of what will be saved.

**GUARDS**:
- User cancels -> "Configuration cancelled."
- No changes -> "No changes needed - config unchanged."

Write to `~/.meicento-hud/config.json`:

```json
{
  "display": {
    "showTokens": true,
    "showUsage": true,
    "showThinking": false,
    "showCallCounts": false
  },
  "gitStatus": {
    "showDirty": true
  }
}
```

Only write keys that differ from defaults (all-true). This keeps the config file minimal.

## After Writing

Say: "Configuration saved! Changes take effect on the next HUD refresh (within seconds)."
