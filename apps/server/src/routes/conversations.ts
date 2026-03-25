import { Hono } from 'hono';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';

const conversations = new Hono();

// GET /conversations
conversations.get('/', (c) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.*, COUNT(DISTINCT p.id) as participant_count,
           (SELECT COUNT(*) FROM tasks t WHERE t.conversation_id = c.id) as task_count
    FROM conversations c
    LEFT JOIN participants p ON p.conversation_id = c.id
    GROUP BY c.id
    ORDER BY c.pinned_at DESC NULLS LAST, c.updated_at DESC
  `).all();
  return c.json(rows);
});

// GET /conversations/:id
conversations.get('/:id', (c) => {
  const db = getDb();
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(c.req.param('id'));
  if (!conv) return c.json({ error: 'not found' }, 404);

  const participants = db.prepare('SELECT * FROM participants WHERE conversation_id = ?').all(c.req.param('id'));
  const tasks = db.prepare('SELECT * FROM tasks WHERE conversation_id = ? ORDER BY created_at').all(c.req.param('id'));

  return c.json({ ...conv as any, participants, tasks });
});

// GET /conversations/:id/messages
conversations.get('/:id/messages', (c) => {
  const db = getDb();
  const limit = Number(c.req.query('limit') || 50);
  const before = c.req.query('before');

  let query = 'SELECT * FROM messages WHERE conversation_id = ?';
  const params: any[] = [c.req.param('id')];

  if (before) {
    query += ' AND created_at < ?';
    params.push(before);
  }

  query += ' ORDER BY created_at ASC LIMIT ?';
  params.push(limit);

  return c.json(db.prepare(query).all(...params));
});

// POST /conversations — 创建
conversations.post('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const id = nanoid(12);

  db.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)').run(id, body.title);

  // 添加创建者作为参与者
  if (body.creatorName) {
    db.prepare(`
      INSERT INTO participants (id, conversation_id, type, name, avatar)
      VALUES (?, ?, 'human', ?, ?)
    `).run(nanoid(12), id, body.creatorName, body.creatorAvatar || null);
  }

  return c.json({ id }, 201);
});

// POST /conversations/:id/messages — 发消息
conversations.post('/:id/messages', async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const id = nanoid(12);

  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, sender_type, sender_name, content, content_type, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, c.req.param('id'),
    body.senderId, body.senderType, body.senderName,
    body.content, body.contentType || 'text',
    body.metadata ? JSON.stringify(body.metadata) : null,
  );

  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(c.req.param('id'));

  return c.json({ id }, 201);
});

export { conversations };
