#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MEICENTO HUD v2 Installer (macOS / Linux)
# Shell-native — requires only bash + jq, no Node.js
# ═══════════════════════════════════════════════════════════════════════════
set -e

INSTALL_DIR="$HOME/.meicento-hud"
REPO_URL="https://github.com/lishtys/meicento-claude-code-terminal-hud.git"
SETTINGS_FILE="$HOME/.claude/settings.json"

echo "🎨 Installing meicento-claude-code-terminal-hud v2..."

# ── Platform ──────────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Darwin*) PLATFORM="macos"   ;;
  Linux*)  PLATFORM="linux"   ;;
  *)       PLATFORM="$OS"     ;;
esac
echo "📍 Platform: $PLATFORM"

# ── Prerequisites: bash + jq ─────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo "❌ jq not found."
  case "$PLATFORM" in
    macos) echo "   Install with: brew install jq" ;;
    linux) echo "   Install with: apt install jq  or  yum install jq" ;;
  esac
  exit 1
fi
echo "📍 jq $(jq --version 2>/dev/null || echo 'ok')"

# ── Clone or update ──────────────────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
  echo "🔄 Existing installation found, updating..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  echo "📥 Cloning to $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# ── Make executable ──────────────────────────────────────────
chmod +x "$INSTALL_DIR/statusline.sh"

# ── Configure Claude Code settings.json ──────────────────────
HUD_CMD="$INSTALL_DIR/statusline.sh"

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "❌ Claude Code settings not found at $SETTINGS_FILE"
  echo "   Launch Claude Code at least once first."
  exit 1
fi

# Atomic update: jq → tmp → rename
_tmp="${SETTINGS_FILE}.tmp.$$"
jq --arg cmd "$HUD_CMD" '.statusLine = {"type": "command", "command": $cmd}' \
  "$SETTINGS_FILE" > "$_tmp" && mv "$_tmp" "$SETTINGS_FILE"

echo ""
echo "✅ Installation complete!"
echo "   statusLine → $HUD_CMD"
echo "🔄 Restart Claude Code to see the HUD."
