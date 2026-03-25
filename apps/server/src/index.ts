import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { agents } from './routes/agents.js';
import { conversations } from './routes/conversations.js';
import { tasks } from './routes/tasks.js';
import { chatRouter } from './routes/chat.js';
import { getDb } from './db/database.js';
import { nanoid } from 'nanoid';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health
app.get('/', (c) => c.json({
  name: 'XTeam Server',
  version: '0.1.0',
  status: 'ok',
}));

// Routes
app.route('/api/agents', agents);
app.route('/api/conversations', conversations);
app.route('/api/tasks', tasks);
app.route('/api/chat', chatRouter);

// Seed default agents if empty
function seedAgents() {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM agents').get() as { c: number }).c;
  if (count > 0) return;

  const defaults = [
    { name: '内容选题 Agent', desc: '分析热点趋势，生成选题方向', avatar: '📊', color: '#22c55e', provider: 'openclaw', model: 'claude-sonnet-4-20250514', caps: ['content_planning', 'trend_analysis'] },
    { name: '数据复盘 Agent', desc: '拉取和分析数据，生成归因报告', avatar: '📈', color: '#a855f7', provider: 'openclaw', model: 'gpt-4o', caps: ['data_analysis', 'reporting'] },
    { name: '热点监测 Agent', desc: '监控全网热点，及时预警', avatar: '🔥', color: '#f97316', provider: 'openclaw', model: 'qwen-3.5', caps: ['monitoring', 'alerting'] },
    { name: '文案撰写 Agent', desc: '生成高转化率内容文案', avatar: '✍️', color: '#3b82f6', provider: 'openclaw', model: 'claude-opus-4-20250514', caps: ['writing', 'seo'] },
    { name: '封面设计 Agent', desc: '自动生成和优化封面', avatar: '🎨', color: '#ec4899', provider: 'openclaw', model: 'dall-e-3', caps: ['image_generation', 'design'] },
    { name: '竞品分析 Agent', desc: '监控竞品动态，策略分析', avatar: '🔍', color: '#06b6d4', provider: 'openclaw', model: 'deepseek-r1', caps: ['competitive_analysis', 'research'] },
  ];

  const stmt = db.prepare(
    'INSERT INTO agents (id, name, description, avatar, color, provider, model, capabilities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  for (const a of defaults) {
    stmt.run(nanoid(12), a.name, a.desc, a.avatar, a.color, a.provider, a.model, JSON.stringify(a.caps), 'online');
  }
  console.log('[Seed] Created', defaults.length, 'default agents');
}

// Start
const PORT = Number(process.env.PORT || 3100);
console.log(`🚀 XTeam Server starting on port ${PORT}...`);
getDb();
seedAgents();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`✅ XTeam Server running at http://localhost:${info.port}`);
});
