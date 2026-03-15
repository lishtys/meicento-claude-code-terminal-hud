/**
 * MEICENTO HUD - Transcript Parser
 *
 * Parses JSONL transcript from Claude Code to extract:
 * - Active agents and their status
 * - Todo items
 * - Tool/agent/skill call counts
 * - Token usage (per-request and session totals)
 * - Thinking state
 * - Pending permissions
 */
import {
  existsSync,
  statSync,
  openSync,
  readSync,
  closeSync,
  createReadStream,
} from 'node:fs';
import { createInterface } from 'node:readline';
import { basename } from 'node:path';
import type {
  TranscriptData,
  ActiveAgent,
  TodoItem,
  LastRequestTokenUsage,
  ThinkingState,
  PendingPermission,
} from './types.js';

// Performance constants
const MAX_TAIL_BYTES = 512 * 1024; // 500KB
const MAX_AGENT_MAP_SIZE = 100;
const STALE_AGENT_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const PERMISSION_THRESHOLD_MS = 3000;
const THINKING_RECENCY_MS = 30_000;

const PERMISSION_TOOLS = ['Edit', 'Write', 'Bash', 'proxy_Edit', 'proxy_Write', 'proxy_Bash'];
const THINKING_PART_TYPES = ['thinking', 'reasoning'];

// Module-level state cleared on each parse
const pendingPermissionMap = new Map<string, PendingPermission>();

interface ParseState {
  agentMap: Map<string, ActiveAgent>;
  backgroundAgentMap: Map<string, string>;
  latestTodos: TodoItem[];
  result: TranscriptData;
  sessionTokenTotals: {
    inputTokens: number;
    outputTokens: number;
    seenUsage: boolean;
  };
  observedSessionIds: Set<string>;
}

export async function parseTranscript(transcriptPath: string | undefined): Promise<TranscriptData> {
  pendingPermissionMap.clear();

  const result: TranscriptData = {
    agents: [],
    todos: [],
    toolCallCount: 0,
    agentCallCount: 0,
    skillCallCount: 0,
  };

  if (!transcriptPath || !existsSync(transcriptPath)) {
    return result;
  }

  const state: ParseState = {
    agentMap: new Map(),
    backgroundAgentMap: new Map(),
    latestTodos: [],
    result,
    sessionTokenTotals: { inputTokens: 0, outputTokens: 0, seenUsage: false },
    observedSessionIds: new Set(),
  };

  try {
    const stat = statSync(transcriptPath);
    const fileSize = stat.size;

    if (fileSize > MAX_TAIL_BYTES) {
      // Large file: tail-based parsing
      const lines = readTailLines(transcriptPath, fileSize, MAX_TAIL_BYTES);
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          processEntry(JSON.parse(line), state);
        } catch {
          // Skip malformed lines
        }
      }
    } else {
      // Small file: stream entire file
      const fileStream = createReadStream(transcriptPath);
      const rl = createInterface({ input: fileStream, crlfDelay: Infinity });
      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          processEntry(JSON.parse(line), state);
        } catch {
          // Skip malformed lines
        }
      }
    }
  } catch {
    // Return partial results
  }

  // Post-processing
  const now = Date.now();

  // Filter stale agents
  for (const agent of state.agentMap.values()) {
    if (agent.status === 'running') {
      const runningTime = now - agent.startTime.getTime();
      if (runningTime > STALE_AGENT_THRESHOLD_MS) {
        agent.status = 'completed';
        agent.endTime = new Date(agent.startTime.getTime() + STALE_AGENT_THRESHOLD_MS);
      }
    }
  }

  // Pending permissions
  for (const [, permission] of pendingPermissionMap) {
    const age = now - permission.timestamp.getTime();
    if (age <= PERMISSION_THRESHOLD_MS) {
      result.pendingPermission = permission;
      break;
    }
  }

  // Thinking recency
  if (result.thinkingState?.lastSeen) {
    const age = now - result.thinkingState.lastSeen.getTime();
    result.thinkingState.active = age <= THINKING_RECENCY_MS;
  }

  // Collect agents: running first, then recent completed
  const running = Array.from(state.agentMap.values()).filter(a => a.status === 'running');
  const completed = Array.from(state.agentMap.values()).filter(a => a.status === 'completed');
  result.agents = [...running, ...completed.slice(-(10 - running.length))].slice(0, 10);

  result.todos = state.latestTodos;

  // Session totals (only reliable if single session)
  if (state.observedSessionIds.size <= 1 && state.sessionTokenTotals.seenUsage) {
    result.sessionTotalTokens =
      state.sessionTokenTotals.inputTokens + state.sessionTokenTotals.outputTokens;
  }

  return result;
}

function readTailLines(filePath: string, fileSize: number, maxBytes: number): string[] {
  const startOffset = Math.max(0, fileSize - maxBytes);
  const bytesToRead = fileSize - startOffset;
  const fd = openSync(filePath, 'r');
  const buffer = Buffer.alloc(bytesToRead);
  try {
    readSync(fd, buffer, 0, bytesToRead, startOffset);
  } finally {
    closeSync(fd);
  }

  const content = buffer.toString('utf8');
  const lines = content.split('\n');

  // Discard potentially incomplete first line if reading from mid-file
  if (startOffset > 0 && lines.length > 0) {
    lines.shift();
  }

  return lines;
}

function processEntry(entry: Record<string, unknown>, state: ParseState): void {
  const timestamp = entry.timestamp
    ? new Date(entry.timestamp as string)
    : new Date();

  if (entry.sessionId) {
    state.observedSessionIds.add(entry.sessionId as string);
  }

  // Token usage
  const message = entry.message as Record<string, unknown> | undefined;
  const usage = extractTokenUsage(message?.usage as Record<string, unknown> | undefined);
  if (usage) {
    state.result.lastRequestTokenUsage = usage;
    state.sessionTokenTotals.inputTokens += usage.inputTokens;
    state.sessionTokenTotals.outputTokens += usage.outputTokens;
    state.sessionTokenTotals.seenUsage = true;
  }

  // Session start
  if (!state.result.sessionStart && entry.timestamp) {
    state.result.sessionStart = timestamp;
  }

  const content = message?.content;
  if (!content || !Array.isArray(content)) return;

  for (const block of content) {
    // Thinking blocks
    if (THINKING_PART_TYPES.includes(block.type)) {
      state.result.thinkingState = { active: true, lastSeen: timestamp };
    }

    // Tool use tracking
    if (block.type === 'tool_use' && block.id && block.name) {
      state.result.toolCallCount++;

      // Agent tracking (Task/proxy_Task)
      if (block.name === 'Task' || block.name === 'proxy_Task') {
        state.result.agentCallCount++;
        const input = block.input as Record<string, unknown> | undefined;
        const agentEntry: ActiveAgent = {
          id: block.id,
          type: (input?.subagent_type as string) ?? 'unknown',
          model: input?.model as string | undefined,
          description: input?.description as string | undefined,
          status: 'running',
          startTime: timestamp,
        };

        // Evict oldest completed agent if at capacity
        if (state.agentMap.size >= MAX_AGENT_MAP_SIZE) {
          let oldestId: string | null = null;
          let oldestTime = Infinity;
          for (const [id, agent] of state.agentMap) {
            if (agent.status === 'completed' && agent.startTime.getTime() < oldestTime) {
              oldestTime = agent.startTime.getTime();
              oldestId = id;
            }
          }
          if (oldestId) state.agentMap.delete(oldestId);
        }

        state.agentMap.set(block.id, agentEntry);
      }

      // Todo tracking
      if (block.name === 'TodoWrite') {
        const input = block.input as { todos?: Array<{ content: string; status: string; activeForm?: string }> } | undefined;
        if (input?.todos && Array.isArray(input.todos)) {
          state.latestTodos.length = 0;
          state.latestTodos.push(
            ...input.todos.map(t => ({
              content: t.content,
              status: t.status,
              activeForm: t.activeForm,
            })),
          );
        }
      }

      // Skill tracking
      if (block.name === 'Skill' || block.name === 'proxy_Skill') {
        state.result.skillCallCount++;
        const input = block.input as { skill?: string; args?: string } | undefined;
        if (input?.skill) {
          state.result.lastActivatedSkill = {
            name: input.skill,
            args: input.args,
            timestamp,
          };
        }
      }

      // Permission tracking
      if (PERMISSION_TOOLS.includes(block.name)) {
        pendingPermissionMap.set(block.id, {
          toolName: block.name.replace('proxy_', ''),
          targetSummary: extractTargetSummary(block.input, block.name),
          timestamp,
        });
      }
    }

    // Tool result tracking
    if (block.type === 'tool_result' && block.tool_use_id) {
      pendingPermissionMap.delete(block.tool_use_id);

      const agent = state.agentMap.get(block.tool_use_id);
      if (agent) {
        const blockContent = block.content;
        const isBackgroundLaunch =
          typeof blockContent === 'string'
            ? blockContent.includes('Async agent launched')
            : Array.isArray(blockContent) &&
              blockContent.some(
                (c: Record<string, unknown>) =>
                  c.type === 'text' && (c.text as string)?.includes('Async agent launched'),
              );

        if (isBackgroundLaunch) {
          const bgAgentId = extractBackgroundAgentId(blockContent);
          if (bgAgentId) {
            state.backgroundAgentMap.set(bgAgentId, block.tool_use_id);
          }
        } else {
          agent.status = 'completed';
          agent.endTime = timestamp;
        }
      }

      // TaskOutput completion
      if (block.content) {
        const taskOutput = parseTaskOutputResult(block.content);
        if (taskOutput?.status === 'completed') {
          const toolUseId = state.backgroundAgentMap.get(taskOutput.taskId);
          if (toolUseId) {
            const bgAgent = state.agentMap.get(toolUseId);
            if (bgAgent?.status === 'running') {
              bgAgent.status = 'completed';
              bgAgent.endTime = timestamp;
            }
          }
        }
      }
    }
  }
}

function extractTokenUsage(
  usage: Record<string, unknown> | undefined,
): LastRequestTokenUsage | null {
  if (!usage) return null;

  const inputTokens = getNumericValue(usage.input_tokens);
  const outputTokens = getNumericValue(usage.output_tokens);

  const reasoningTokens = getNumericValue(
    usage.reasoning_tokens ??
      (usage.output_tokens_details as Record<string, unknown> | undefined)?.reasoning_tokens ??
      (usage.completion_tokens_details as Record<string, unknown> | undefined)?.reasoning_tokens,
  );

  if (inputTokens == null && outputTokens == null) return null;

  const result: LastRequestTokenUsage = {
    inputTokens: Math.max(0, Math.round(inputTokens ?? 0)),
    outputTokens: Math.max(0, Math.round(outputTokens ?? 0)),
  };

  if (reasoningTokens != null && reasoningTokens > 0) {
    result.reasoningTokens = Math.max(0, Math.round(reasoningTokens));
  }

  return result;
}

function getNumericValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function extractBackgroundAgentId(content: unknown): string | null {
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? (content.find((c: Record<string, unknown>) => c.type === 'text') as Record<string, string> | undefined)?.text || ''
        : '';
  const match = text.match(/agentId:\s*([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function parseTaskOutputResult(
  content: unknown,
): { taskId: string; status: string } | null {
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? (content.find((c: Record<string, unknown>) => c.type === 'text') as Record<string, string> | undefined)?.text || ''
        : '';
  const taskIdMatch = text.match(/<task_id>([^<]+)<\/task_id>/);
  const statusMatch = text.match(/<status>([^<]+)<\/status>/);
  if (taskIdMatch && statusMatch) {
    return { taskId: taskIdMatch[1], status: statusMatch[1] };
  }
  return null;
}

function extractTargetSummary(input: unknown, toolName: string): string {
  if (!input || typeof input !== 'object') return '...';
  const inp = input as Record<string, unknown>;

  if (toolName.includes('Edit') || toolName.includes('Write')) {
    const filePath = inp.file_path as string | undefined;
    if (filePath) return basename(filePath) || filePath;
  }

  if (toolName.includes('Bash')) {
    const cmd = inp.command as string | undefined;
    if (cmd) {
      const trimmed = cmd.trim().substring(0, 20);
      return trimmed.length < cmd.trim().length ? `${trimmed}...` : trimmed;
    }
  }

  return '...';
}
