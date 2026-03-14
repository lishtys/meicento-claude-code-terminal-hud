# Claude HUD (Gruvbox Edition)

A lightweight, high-performance status line for Claude Code, inspired by `oh-my-claudecode` and `claude-code-terminal-pro`.

## Features
- 🎨 **Gruvbox Dark** color scheme.
- 📊 **20-segment Context Progress Bar**.
- 󰚩 **Model Display** (e.g., Claude 3.5 Sonnet).
- 󰌠 **Token Usage** (Input/Output).
- 󰉖 **Current Workspace** & 󰊢 **Git Branch**.
- ⚡ **Zero-runtime-dep execution** using `tsx`.

## Prerequisites
- [Claude Code](https://github.com/anthropics/claude-code)
- Node.js & npm
- `tsx` (installed via `npm install -g tsx`)

## Installation

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd claude-hud
   npm install
   ```

2. Get the absolute path to `src/index.ts`.

3. Configure Claude Code:
   Open `~/.claude/settings.json` and add/update the `statusLine` configuration:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "tsx /absolute/path/to/claude-hud/src/index.ts"
     }
   }
   ```

4. Restart Claude Code.

## Development & Testing
You can test the HUD output by piping a sample JSON:
```bash
echo '{"model": {"display_name": "Claude 3.5 Sonnet"}, "context_window": {"used_percentage": 0.45, "total_input_tokens": 12000, "total_output_tokens": 500}}' | tsx src/index.ts
```

## License
MIT
