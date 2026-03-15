import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 获取项目根目录下的编译后的 index.js 路径
// 注意：我们的 src/index.ts 经过 tsc 后会生成在 dist/index.js
const rootDir = path.resolve(__dirname, '..');
const hudPath = path.join(rootDir, 'src/index.ts'); // 暂时使用 tsx 直接运行源码，或者 dist/index.js

// 2. 确定 Claude 设置文件的位置
const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

console.log('🚀 开始自动化配置 Meicento HUD...');

if (!fs.existsSync(settingsPath)) {
  console.error('❌ 错误: 未找到 Claude 设置文件 (~/.claude/settings.json)');
  console.log('💡 请确保你已经安装并运行过一次 Claude Code。');
  process.exit(1);
}

try {
  // 3. 读取现有配置
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

  // 4. 更新 statusLine
  // 我们推荐使用 tsx 直接运行，这样最方便
  const command = `/usr/bin/env npx tsx ${hudPath}`;

  settings.statusLine = {
    type: 'command',
    command: command
  };

  // 5. 写回文件
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  console.log('✅ 配置成功！');
  console.log(`📍 已设置 statusLine 命令为: ${command}`);
  console.log('🔄 请重启 Claude Code 以应用更改。');

} catch (err: any) {
  console.error('❌ 配置失败:', err.message);
}
