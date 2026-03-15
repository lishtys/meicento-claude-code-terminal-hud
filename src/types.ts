/**
 * MEICENTO HUD - Type Definitions
 */

export interface StatuslineStdin {
  model?: {
    id?: string;
    display_name?: string;
  };
  context_window?: {
    used_percentage?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
    current_usage?: number;
  };
  duration?: string;
  mcp?: {
    servers_count?: number;
  };
  rate_limits?: {
    five_hour_percent?: number;
    weekly_percent?: number;
    weekly_resets_at?: string;
  };
  transcript_path?: string;
}

export interface RateLimits {
  fiveHourPercent: number;
  weeklyPercent?: number;
  fiveHourResetsAt?: Date | null;
  weeklyResetsAt?: Date | null;
  monthlyPercent?: number;
  monthlyResetsAt?: Date | null;
}

export interface UsageResult {
  rateLimits: RateLimits | null;
  error?: string;
  stale?: boolean;
}

export interface ActiveAgent {
  id: string;
  type: string;
  model?: string;
  description?: string;
  status: 'running' | 'completed';
  startTime: Date;
  endTime?: Date;
}

export interface TodoItem {
  content: string;
  status: string;
  activeForm?: string;
}

export interface ThinkingState {
  active: boolean;
  lastSeen: Date;
}

export interface LastRequestTokenUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
}

export interface PendingPermission {
  toolName: string;
  targetSummary: string;
  timestamp: Date;
}

export interface TranscriptData {
  agents: ActiveAgent[];
  todos: TodoItem[];
  lastActivatedSkill?: { name: string; args?: string; timestamp: Date };
  toolCallCount: number;
  agentCallCount: number;
  skillCallCount: number;
  lastRequestTokenUsage?: LastRequestTokenUsage;
  sessionStart?: Date;
  sessionTotalTokens?: number;
  thinkingState?: ThinkingState;
  pendingPermission?: PendingPermission;
}

export interface HudRenderContext {
  model: string;
  modelId?: string;
  contextUsage: number;
  totalInput: number;
  totalOutput: number;
  duration: string | null;
  mcpCount: number;
  workingDir: string;
  repoName: string | null;
  branch: string | null;

  // Usage API data (Phase 1)
  usageResult?: UsageResult;

  // Stdin rate limits (fallback)
  stdinRateLimits?: StatuslineStdin['rate_limits'];

  // Transcript data (Phase 2)
  transcript?: TranscriptData;
}
