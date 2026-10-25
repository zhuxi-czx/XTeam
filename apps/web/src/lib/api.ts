/**
 * XTeam API Client
 * 连接 XTeam Server (Hono)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.3.128:3100';

// ── Types ──

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
  provider: string;
  model: string;
  system_prompt: string | null;
  capabilities: string[];
  status: 'online' | 'busy' | 'offline';
  tasks_completed: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  status: string;
  pinned_at: string | null;
  participant_count: number;
  task_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'human' | 'agent' | 'system';
  sender_name: string;
  content: string;
  content_type: string;
  metadata: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  conversation_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  expected_output: string | null;
  result: string | null;
  parent_task_id: string | null;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  /** achieved 由后端按关联任务实时算出；paused 为手动设置 */
  status: 'active' | 'achieved' | 'paused';
  progress: number;
  task_total: number;
  task_done: number;
  conversation_ids: string[];
  created_at: string;
  updated_at: string;
}

// ── Fetcher ──

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// ── Agents ──

export const agentsApi = {
  list: () => apiFetch<Agent[]>('/api/agents'),
  get: (id: string) => apiFetch<Agent>(`/api/agents/${id}`),
  create: (data: Partial<Agent>) => apiFetch<{ id: string }>('/api/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Agent>) => apiFetch<{ ok: boolean }>(`/api/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiFetch<{ ok: boolean }>(`/api/agents/${id}`, {
    method: 'DELETE',
  }),
};

// ── Conversations ──

export const conversationsApi = {
  list: () => apiFetch<Conversation[]>('/api/conversations'),
  get: (id: string) => apiFetch<Conversation & { participants: any[]; tasks: Task[] }>(`/api/conversations/${id}`),
  create: (data: { title: string; creatorName: string }) => apiFetch<{ id: string }>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  messages: (id: string, limit = 50) => apiFetch<Message[]>(`/api/conversations/${id}/messages?limit=${limit}`),
  addMessage: (id: string, data: {
    senderId: string;
    senderType: string;
    senderName: string;
    content: string;
  }) => apiFetch<{ id: string }>(`/api/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  /** 把对话里的全部任务关联到目标；goalId 为 null 时取消关联 */
  setGoal: (id: string, goalId: string | null) => apiFetch<{ ok: boolean; tasks: number }>(`/api/conversations/${id}/goal`, {
    method: 'PUT',
    body: JSON.stringify({ goalId }),
  }),
};

// ── Tasks ──

export const tasksApi = {
  list: (status?: string) => apiFetch<Task[]>(`/api/tasks${status ? `?status=${status}` : ''}`),
  get: (id: string) => apiFetch<Task>(`/api/tasks/${id}`),
  create: (data: Partial<Task>) => apiFetch<{ id: string }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<Task>) => apiFetch<{ ok: boolean }>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

// ── Goals ──

export const goalsApi = {
  list: () => apiFetch<Goal[]>('/api/goals'),
  get: (id: string) => apiFetch<Goal & { tasks: Task[] }>(`/api/goals/${id}`),
  create: (data: { title: string; description?: string }) => apiFetch<{ id: string }>('/api/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: { title?: string; description?: string | null; status?: 'active' | 'paused' }) =>
    apiFetch<{ ok: boolean }>(`/api/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiFetch<{ ok: boolean }>(`/api/goals/${id}`, { method: 'DELETE' }),
};

// ── Chat (SSE Streaming) ──

export function sendChatMessage(
  conversationId: string,
  content: string,
  senderName: string,
  callbacks: {
    onStart?: (msgId: string) => void;
    onChunk?: (chunk: string) => void;
    onDone?: (msgId: string, fullContent: string) => void;
    onError?: (error: string) => void;
  },
  agentId?: string,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/chat/${conversationId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, senderName, agentId }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      callbacks.onError?.(`HTTP ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            switch (parsed.type) {
              case 'start':
                callbacks.onStart?.(parsed.msgId);
                break;
              case 'chunk':
                callbacks.onChunk?.(parsed.content);
                break;
              case 'done':
                callbacks.onDone?.(parsed.msgId, parsed.content);
                break;
              case 'error':
                callbacks.onError?.(parsed.error);
                break;
            }
          } catch { /* ignore */ }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      callbacks.onError?.(err.message);
    }
  });

  return controller;
}

// ── Orchestrate (SSE Streaming) ──

export interface OrchestrateCallbacks {
  onStart?: (goal: string) => void;
  onTaskCreated?: (taskId: string, title: string, agentName: string) => void;
  onTaskProgress?: (taskId: string, progress: number) => void;
  onDone?: (taskCount: number, summary: string) => void;
  onError?: (error: string) => void;
}

export function startOrchestration(
  conversationId: string,
  goal: string,
  callbacks: OrchestrateCallbacks,
  goalId?: string,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/orchestrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, goal, goalId }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      callbacks.onError?.(`HTTP ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            switch (parsed.type) {
              case 'orchestrate:start':
                callbacks.onStart?.(parsed.goal);
                break;
              case 'task:created':
                callbacks.onTaskCreated?.(parsed.taskId, parsed.title, parsed.agentName);
                break;
              case 'task:progress':
                callbacks.onTaskProgress?.(parsed.taskId, parsed.progress);
                break;
              case 'orchestrate:done':
                callbacks.onDone?.(parsed.taskCount, parsed.summary);
                break;
            }
          } catch { /* ignore */ }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      callbacks.onError?.(err.message);
    }
  });

  return controller;
}
