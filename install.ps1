# MEICENTO HUD - Windows PowerShell installer
# Usage: irm https://raw.githubusercontent.com/lishtys/meicento-claude-code-terminal-hud/master/install.ps1 | iex

$ErrorActionPreference = "Stop"

$INSTALL_DIR = Join-Path $env:USERPROFILE ".meicento-hud"
$REPO_URL = "https://github.com/lishtys/meicento-claude-code-terminal-hud.git"

Write-Host "🎨 Installing meicento-claude-code-terminal-hud..." -ForegroundColor Cyan

# 1. Check prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js not found. Please install Node.js and npm first." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: git not found. Please install git first." -ForegroundColor Red
    exit 1
}

$nodeVersion = & node -v
$npmVersion = & npm -v
Write-Host "📍 Node.js $nodeVersion | npm $npmVersion"

# 2. Clone or update
if (Test-Path $INSTALL_DIR) {
    Write-Host "🔄 Existing installation found, updating..."
    Push-Location $INSTALL_DIR
    & git pull
} else {
    Write-Host "📥 Cloning source to $INSTALL_DIR..."
    & git clone $REPO_URL $INSTALL_DIR
    Push-Location $INSTALL_DIR
}

# 3. Install dependencies
Write-Host "📦 Installing dependencies..."
& npm install --quiet

# 4. Run setup
Write-Host "⚙️ Configuring Claude Code..."
& npm run setup

Pop-Location

Write-Host ""
Write-Host "✨ Installation complete!" -ForegroundColor Green
Write-Host "🔄 Please restart your Claude Code session to see the HUD."
Write-Host "💡 Paths have been auto-converted to POSIX format for Claude Code compatibility." -ForegroundColor Yellow
