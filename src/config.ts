/**
 * MEICENTO HUD - Configuration System
 *
 * Config file: ~/.meicento-hud/config.json
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface HudConfig {
  display: {
    showTokens: boolean;
    showUsage: boolean;
    showThinking: boolean;
    showSkills: boolean;
    showCallCounts: boolean;
    showTodos: boolean;
    showProject: boolean;
    showGit: boolean;
    showConfigCounts: boolean;
    showDuration: boolean;
    showAgents: boolean;
    showContextWarning: boolean;
    showPermission: boolean;
  };
  gitStatus: {
    showDirty: boolean;
  };
}

export const DEFAULT_CONFIG: HudConfig = {
  display: {
    showTokens: true,
    showUsage: true,
    showThinking: true,
    showSkills: true,
    showCallCounts: true,
    showTodos: true,
    showProject: true,
    showGit: true,
    showConfigCounts: true,
    showDuration: true,
    showAgents: true,
    showContextWarning: true,
    showPermission: true,
  },
  gitStatus: {
    showDirty: true,
  },
};

export function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  return join(homeDir, '.meicento-hud', 'config.json');
}

export function loadConfig(): HudConfig {
  try {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) return DEFAULT_CONFIG;

    const content = readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content) as Partial<HudConfig>;
    return mergeConfig(userConfig);
  } catch {
    return DEFAULT_CONFIG;
  }
}

function mergeConfig(user: Partial<HudConfig>): HudConfig {
  const d = DEFAULT_CONFIG.display;
  const ud: Partial<HudConfig['display']> = user.display || {};
  const ug: Partial<HudConfig['gitStatus']> = user.gitStatus || {};

  return {
    display: {
      showTokens: typeof ud.showTokens === 'boolean' ? ud.showTokens : d.showTokens,
      showUsage: typeof ud.showUsage === 'boolean' ? ud.showUsage : d.showUsage,
      showThinking: typeof ud.showThinking === 'boolean' ? ud.showThinking : d.showThinking,
      showSkills: typeof ud.showSkills === 'boolean' ? ud.showSkills : d.showSkills,
      showCallCounts: typeof ud.showCallCounts === 'boolean' ? ud.showCallCounts : d.showCallCounts,
      showTodos: typeof ud.showTodos === 'boolean' ? ud.showTodos : d.showTodos,
      showProject: typeof ud.showProject === 'boolean' ? ud.showProject : d.showProject,
      showGit: typeof ud.showGit === 'boolean' ? ud.showGit : d.showGit,
      showConfigCounts: typeof ud.showConfigCounts === 'boolean' ? ud.showConfigCounts : d.showConfigCounts,
      showDuration: typeof ud.showDuration === 'boolean' ? ud.showDuration : d.showDuration,
      showAgents: typeof ud.showAgents === 'boolean' ? ud.showAgents : d.showAgents,
      showContextWarning: typeof ud.showContextWarning === 'boolean' ? ud.showContextWarning : d.showContextWarning,
      showPermission: typeof ud.showPermission === 'boolean' ? ud.showPermission : d.showPermission,
    },
    gitStatus: {
      showDirty: typeof ug.showDirty === 'boolean' ? ug.showDirty : DEFAULT_CONFIG.gitStatus.showDirty,
    },
  };
}
