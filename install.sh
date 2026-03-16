#!/bin/bash

# MEICENTO HUD installer (macOS / Linux / Windows Git Bash)
set -e

INSTALL_DIR="$HOME/.meicento-hud"
REPO_URL="https://github.com/lishtys/meicento-claude-code-terminal-hud.git"

echo "🎨 Installing meicento-claude-code-terminal-hud..."

# 0. Detect platform
OS="$(uname -s)"
case "$OS" in
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
  Darwin*)              PLATFORM="macos"   ;;
  Linux*)               PLATFORM="linux"   ;;
  *)                    PLATFORM="unknown" ;;
esac

echo "📍 Detected platform: $PLATFORM ($OS)"

# 1. Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found. Please install Node.js and npm first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Error: git not found. Please install git first."
    exit 1
fi

echo "📍 Node.js $(node -v) | npm $(npm -v)"

# 2. Clone or update
if [ -d "$INSTALL_DIR" ]; then
    echo "🔄 Existing installation found, updating..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "📥 Cloning source to $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm install --quiet

# 4. Run setup (setup.ts handles cross-platform paths)
echo "⚙️ Configuring Claude Code..."
npm run setup

echo ""
echo "✨ Installation complete!"
echo "🔄 Please restart your Claude Code session to see the HUD."

if [ "$PLATFORM" = "windows" ]; then
    echo ""
    echo "💡 Windows note: Paths have been auto-converted to POSIX format for Claude Code compatibility."
fi
