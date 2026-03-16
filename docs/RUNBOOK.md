# Runbook

## Installation

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

This clones to `~/.meicento-hud/`, runs `npm install`, and configures `~/.claude/settings.json`.

### Update

```bash
cd ~/.meicento-hud && git pull && npm install
```

### Uninstall

1. Remove the statusLine from settings:
   ```bash
   # Edit ~/.claude/settings.json and remove the "statusLine" key
   ```
2. Remove install directory:
   ```bash
   rm -rf ~/.meicento-hud
   ```
3. Remove cache:
   ```bash
   rm -rf ~/.cache/meicento-hud
   ```

## Common Issues

### No colors in HUD output

**Cause:** Using a color library (like picocolors) that auto-disables when `stdout` is not a TTY. Claude Code captures statusline output via pipe.

**Fix:** Already fixed — project uses raw ANSI escape codes (`\x1b[36m` etc.).

**Verify:**
```bash
echo '{}' | npx tsx ~/.meicento-hud/src/index.ts 2>&1 | cat -v
# Should contain ^[[36m, ^[[33m, etc.
```

### Rate limits showing [API 429]

**Cause:** Too many API calls triggered rate limiting. Backoff: 90s -> 180s -> 300s (max 5min).

**Fix:** Wait for backoff to expire (max 5 minutes). If stdin provides `rate_limits`, those are shown as fallback.

**Clear stale cache:**
```bash
rm -f ~/.cache/meicento-hud/.usage-cache.json
```

### Rate limits showing [API auth]

**Cause:** OAuth credentials expired and refresh failed.

**Fix:** Re-authenticate Claude Code (log out and log in again). Credentials are stored in:
- macOS Keychain: `Claude Code-credentials`
- Fallback file: `~/.claude/.credentials.json`

### HUD not appearing after install

**Check statusLine config:**
```bash
cat ~/.claude/settings.json | grep statusLine
```

Should show:
```json
"statusLine": {"type": "command", "command": "npx tsx /Users/<you>/.meicento-hud/src/index.ts"}
```

On Windows, the path uses forward slashes for shell compatibility:
```json
"statusLine": {"type": "command", "command": "npx tsx C:/Users/<you>/.meicento-hud/src/index.ts"}
```

**Re-run setup:**
```bash
cd ~/.meicento-hud && npm run setup
```

**Restart Claude Code** — statusLine changes require a session restart.

### HUD shows blank or errors silently

The HUD catches all errors silently (by design, to avoid breaking Claude Code). To debug:

```bash
echo '{"model":{"id":"test"}}' | npx tsx ~/.meicento-hud/src/index.ts 2>&1
```

### Config changes not taking effect

Config is read on every HUD invocation (every ~300ms). Changes to `~/.meicento-hud/config.json` take effect immediately.

**Verify config is valid JSON:**
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('$HOME/.meicento-hud/config.json','utf8')))"
```

## Platform Notes

### Windows

- Paths in `statusLine.command` use forward slashes (`C:/Users/...`) for bash compatibility
- The setup script auto-detects Windows and converts paths accordingly
- Both Git Bash and PowerShell installation methods are supported
- OAuth Keychain integration falls back to `~/.claude/.credentials.json` on Windows

### macOS / Linux

- Standard Unix paths work natively
- OAuth credentials retrieved from macOS Keychain (`security` command) when available

## File Locations

| File | Purpose |
|------|---------|
| `~/.meicento-hud/` | Install directory (git repo) |
| `~/.meicento-hud/config.json` | Display configuration |
| `~/.cache/meicento-hud/.usage-cache.json` | API response cache (survives reinstall) |
| `~/.claude/settings.json` | Claude Code settings (statusLine config) |
| `~/.claude/.credentials.json` | OAuth credentials (fallback) |

## Monitoring

### Check API cache status

```bash
cat ~/.cache/meicento-hud/.usage-cache.json
```

Fields to look for:
- `data` — current rate limit data (null = no data)
- `rateLimited` — true if API returned 429
- `rateLimitedCount` — consecutive 429 count
- `rateLimitedUntil` — timestamp when backoff expires
- `lastSuccessAt` — last successful API call

### Check HUD output manually

```bash
echo '{"model":{"id":"claude-sonnet-4-20250514"},"context_window":{"used_percentage":50,"total_input_tokens":50000,"total_output_tokens":5000},"duration":"30m","mcp":{"servers_count":2}}' | npx tsx ~/.meicento-hud/src/index.ts
```
