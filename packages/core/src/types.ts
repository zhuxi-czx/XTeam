// ============================================
// XTeam Core Types
// 人机协同平台核心数据模型
// ============================================

// --- 用户 ---
export interface User {
  id: string
  name: string
  avatar?: string
  role: 'owner' | 'admin' | 'member'
  createdAt: Date
}

// --- Agent ---
export interface Agent {
  id: string
  name: string
  description: string
  avatar?: string
  color: string // 主题色
  provider: string // e.g. 'anthropic', 'openai', 'qwen'
  model: string
  status: 'online' | 'busy' | 'offline'
  capabilities: string[] // e.g. ['analysis', 'writing', 'coding']
  systemPrompt?: string
  createdAt: Date
}

// --- 对话 ---
export interface Conversation {
  id: string
  title: string
  participants: Participant[]
  taskCount: number
  status: 'active' | 'paused' | 'completed'
  pinnedAt?: Date
  updatedAt: Date
  createdAt: Date
}

export interface Participant {
  id: string
  type: 'human' | 'agent'
  userId?: string
  agentId?: string
  name: string
  avatar?: string
  joinedAt: Date
}

// --- 消息 ---
export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderType: 'human' | 'agent' | 'system'
  senderName: string
  content: string
  contentType: 'text' | 'task_card' | 'decision' | 'insight'
  metadata?: Record<string, unknown>
  createdAt: Date
}

// --- 任务 ---
export interface Task {
  id: string
  conversationId?: string
  title: string
  description?: string
  assigneeId?: string // Agent ID
  assigneeName?: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number // 0-100
  expectedOutput?: string
  result?: string
  parentTaskId?: string // 支持子任务
  goalId?: string // 关联目标
  createdAt: Date
  updatedAt: Date
}

// --- 目标 ---
export interface Goal {
  id: string
  title: string
  description?: string
  status: 'active' | 'achieved' | 'paused'
  progress: number
  linkedTaskIds: string[]
  linkedConversationIds: string[]
  createdAt: Date
}

// --- 记忆 ---
export interface Memory {
  id: string
  content: string
  source: 'conversation' | 'task' | 'manual' | 'agent'
  sourceId?: string
  tags: string[]
  importance: number // 0-1
  createdAt: Date
  expiresAt?: Date
}

// --- 工作台仪表盘 ---
export interface DashboardState {
  systemStatus: 'stable' | 'warning' | 'error'
  onlineAgents: number
  pendingDecisions: number
  activeTasks: Task[]
  activeConversations: Conversation[]
  recentMemories: Memory[]
}
