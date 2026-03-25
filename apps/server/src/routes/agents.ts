import { Hono } from 'hono';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';

const agents = new Hono();

// GET /agents — 列表
agents.get('/', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all();
  return c.json(rows.map((r: any) => ({
    ...r,
    capabilities: JSON.parse(r.capabilities || '[]'),
  })));
});

// GET /agents/:id
agents.get('/:id', (c) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(c.req.param('id')) as any;
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json({ ...row, capabilities: JSON.parse(row.capabilities || '[]') });
});

// POST /agents — 创建
agents.post('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const id = nanoid(12);
  db.prepare(`
    INSERT INTO agents (id, name, description, avatar, color, provider, model, system_prompt, capabilities, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, body.name, body.description || null, body.avatar || null,
    body.color || '#8b6cff', body.provider, body.model,
    body.systemPrompt || null, JSON.stringify(body.capabilities || []),
    body.status || 'online',
  );
  return c.json({ id }, 201);
});

// PATCH /agents/:id — 更新
agents.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  const sets: string[] = [];
  const vals: any[] = [];
  for (const [key, val] of Object.entries(body)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (col === 'capabilities') {
      sets.push(`${col} = ?`);
      vals.push(JSON.stringify(val));
    } else {
      sets.push(`${col} = ?`);
      vals.push(val);
    }
  }
  sets.push("updated_at = datetime('now')");
  vals.push(id);

  db.prepare(`UPDATE agents SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return c.json({ ok: true });
});

// DELETE /agents/:id
agents.delete('/:id', (c) => {
  const db = getDb();
  db.prepare('DELETE FROM agents WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

export { agents };
