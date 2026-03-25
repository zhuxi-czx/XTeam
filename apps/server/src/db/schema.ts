/**
 * XTeam Database Schema
 * SQLite (better-sqlite3) — 本地优先，后续可迁移 Supabase
 */

export const SCHEMA_SQL = `
-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  color TEXT DEFAULT '#8b6cff',
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT,
  capabilities TEXT DEFAULT '[]',  -- JSON array
  status TEXT DEFAULT 'offline',   -- online | busy | offline
  tasks_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'active',   -- active | paused | completed
  pinned_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Conversation participants (human or agent)
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- human | agent
  ref_id TEXT,                     -- user_id or agent_id
  name TEXT NOT NULL,
  avatar TEXT,
  joined_at TEXT DEFAULT (datetime('now'))
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,       -- human | agent | system
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- text | task_card | decision | insight
  metadata TEXT,                    -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id TEXT REFERENCES agents(id),
  assignee_name TEXT,
  status TEXT DEFAULT 'queued',    -- queued | running | completed | failed | cancelled
  progress INTEGER DEFAULT 0,      -- 0-100
  expected_output TEXT,
  result TEXT,
  parent_task_id TEXT REFERENCES tasks(id),
  goal_id TEXT REFERENCES goals(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',    -- active | achieved | paused
  progress INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Memories
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL,            -- conversation | task | manual | agent
  source_id TEXT,
  tags TEXT DEFAULT '[]',          -- JSON array
  importance REAL DEFAULT 0.5,     -- 0-1
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_conv ON tasks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_participants_conv ON participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source, source_id);
`;
