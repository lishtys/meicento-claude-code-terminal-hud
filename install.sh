#!/bin/bash

# MEICENTO HUD 一键安装脚本
set -e

INSTALL_DIR="$HOME/.meicento-hud"
REPO_URL="https://github.com/meicento/meicento-claude-code-terminal-hud.git"

echo "🎨 正在安装 meicento-claude-code-terminal-hud..."

# 1. 检查环境
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js。请先安装 Node.js 和 npm。"
    exit 1
fi

# 2. 创建安装目录并下载代码
if [ -d "$INSTALL_DIR" ]; then
    echo "🔄 发现已安装版本，正在更新..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "📥 正在将源码下载到 $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 3. 安装依赖
echo "📦 正在安装依赖..."
npm install --quiet

# 4. 运行自动化配置
echo "⚙️ 正在配置 Claude Code..."
npm run setup

echo ""
echo "✨ 安装完成！"
echo "🔄 请重启您的 Claude Code 会话以看到效果。"
