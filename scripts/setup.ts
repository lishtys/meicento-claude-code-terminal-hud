import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Resolve the path to src/index.ts from the project root
const rootDir = path.resolve(__dirname, '..');
const hudPath = path.join(rootDir, 'src/index.ts');

// 2. Normalize to POSIX-style forward slashes for cross-platform shell compatibility
const hudPathPosix = hudPath.split(path.sep).join('/');

// 3. Locate the Claude Code settings file
const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

const isWindows = process.platform === 'win32';

console.log('🚀 Configuring Meicento HUD...');

if (!fs.existsSync(settingsPath)) {
  console.error('❌ Error: Claude settings file not found (~/.claude/settings.json)');
  console.log('💡 Make sure you have installed and launched Claude Code at least once.');
  process.exit(1);
}

try {
  // 4. Read existing settings
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

  // 5. Generate cross-platform command
  // - macOS/Linux: npx tsx /path/to/index.ts
  // - Windows: npx tsx C:/path/to/index.ts (forward slashes for bash compatibility)
  // Quote the path to handle spaces and special characters in usernames/paths
  const command = `npx tsx "${hudPathPosix}"`;

  settings.statusLine = {
    type: 'command',
    command: command,
  };

  // 6. Atomic write: write to tmp file then rename, to prevent corruption on interrupted writes
  const content = JSON.stringify(settings, null, 2);
  const tmpPath = `${settingsPath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, content);
  fs.renameSync(tmpPath, settingsPath);

  console.log('✅ Configuration successful!');
  console.log(`📍 statusLine command set to: ${command}`);
  if (isWindows) {
    console.log('💡 Platform: Windows (POSIX path format applied)');
  }
  console.log('🔄 Please restart Claude Code to apply changes.');

} catch (err: any) {
  console.error('❌ Configuration failed:', err.message);
}
