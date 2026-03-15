# 🎨 meicento-claude-code-terminal-hud

A refined, high-performance status line for [Claude Code](https://github.com/anthropic-ai/claude-code), featuring a **Gruvbox Dark** aesthetic and rich session metadata.

Inspired by the [OMC](https://github.com/anthropics/omc) project and other community HUDs, this lightweight Node.js script transforms Claude's internal session data into a beautiful, functional status bar at the bottom of your terminal.

---

## ⚡ Features

- **🎨 Gruvbox Theme**: Sophisticated colors for a professional terminal experience.
- **📊 Context Progress**: A 20-segment visual progress bar tracking your context window usage.
- **󰚩 Model Tracking**: See exactly which Claude model is currently active.
- **󰌠 Token Monitor**: Real-time display of input/output token counts.
- **󰊢 Git & Environment**: Automatic detection of current Git branch and working directory.
- **󱑎 Session Duration**: (Optional) Tracks how long your current session has been active.
- **󰒋 MCP Support**: (Optional) Shows the number of active Model Context Protocol servers.

---

## 🚀 Quick Start (Recommended)

Run the following command in your terminal to install and configure automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/lishtys/meicento-claude-code-terminal-hud/master/install.sh | bash
```

---

## 🛠️ Manual Installation (Optional)

If you prefer to install manually:

### 1. Clone & Setup

```bash
git clone https://github.com/lishtys/meicento-claude-code-terminal-hud.git
cd meicento-claude-code-terminal-hud
npm install && npm run setup
```

---

## 🛠️ Testing Locally

You can test the output manually by piping a mock JSON to the script:

```bash
echo '{"model":{"display_name":"Claude 3.5 Sonnet"}, "context_window":{"used_percentage":0.65, "total_input_tokens": 12500, "total_output_tokens": 5200}, "duration": "00:42:15", "mcp": {"servers_count": 2}}' | tsx src/index.ts
```

---

## 🎨 Visual Representation (Gruvbox)

The HUD output looks similar to this:

`󰚩 Claude 3.5 Sonnet │ [████████████░░░░░░] 65% │ 󰌠 12.5ki/5.2ko │ 󱑎 00:42:15 │ 󰒋 2 │ 󰉖 project-dir (󰊢 main)`

---

## 📜 License

MIT © [meicento](https://github.com/meicento)
