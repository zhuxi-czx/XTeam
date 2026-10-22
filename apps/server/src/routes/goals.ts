import { Hono } from 'hono';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';

const goals = new Hono();

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  total: number;
  done: number;
  conversation_ids: string | null;
}

// 进度和“已达成”由关联任务实时算出，不单独存储，避免与任务状态不一致；
// 只有“暂停”是用户手动设置的
const SELECT_GOALS = `
  SELECT g.id, g.title, g.description, g.status, g.created_at, g.updated_at,
         COUNT(t.id) AS total,
         COALESCE(SUM(t.status = 'completed'), 0) AS done,
         GROUP_CONCAT(DISTINCT t.conversation_id) AS conversation_ids
  FROM goals g
  LEFT JOIN tasks t ON t.goal_id = g.id
`;

function present(row: GoalRow) {
  const progress = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
  const status = row.status === 'paused' ? 'paused' : row.total > 0 && row.done === row.total ? 'achieved' : 'active';
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status,
    progress,
    task_total: row.total,
    task_done: row.done,
    conversation_ids: row.conversation_ids ? row.conversation_ids.split(',') : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET /goals
goals.get('/', (c) => {
  const rows = getDb().prepare(`${SELECT_GOALS} GROUP BY g.id ORDER BY g.created_at DESC`).all() as GoalRow[];
  return c.json(rows.map(present));
});

// GET /goals/:id — 含关联任务
goals.get('/:id', (c) => {
  const db = getDb();
  const row = db.prepare(`${SELECT_GOALS} WHERE g.id = ? GROUP BY g.id`).get(c.req.param('id')) as GoalRow | undefined;
  if (!row) return c.json({ error: 'not found' }, 404);
  const tasks = db.prepare('SELECT * FROM tasks WHERE goal_id = ? ORDER BY created_at ASC').all(row.id);
  return c.json({ ...present(row), tasks });
});

// POST /goals
goals.post('/', async (c) => {
  const body = await c.req.json<{ title?: string; description?: string }>();
  const title = body.title?.trim();
  if (!title) return c.json({ error: 'title is required' }, 400);
  const id = nanoid(12);
  getDb()
    .prepare('INSERT INTO goals (id, title, description) VALUES (?, ?, ?)')
    .run(id, title, body.description?.trim() || null);
  return c.json({ id }, 201);
});

// PATCH /goals/:id — 改标题/说明，或在 active / paused 之间切换
goals.patch('/:id', async (c) => {
  const body = await c.req.json<{ title?: string; description?: string | null; status?: 'active' | 'paused' }>();
  if (body.status && body.status !== 'active' && body.status !== 'paused') {
    return c.json({ error: 'status must be active or paused' }, 400);
  }
  if (body.title !== undefined && !body.title.trim()) return c.json({ error: 'title cannot be empty' }, 400);

  const result = getDb()
    .prepare(`
      UPDATE goals SET
        title = COALESCE(?, title),
        description = CASE WHEN ? THEN ? ELSE description END,
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ?
    `)
    .run(
      body.title?.trim() ?? null,
      body.description !== undefined ? 1 : 0,
      body.description?.trim() || null,
      body.status ?? null,
      c.req.param('id'),
    );
  if (result.changes === 0) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});

// DELETE /goals/:id — 任务保留，只解除关联
goals.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const removed = db.transaction(() => {
    db.prepare('UPDATE tasks SET goal_id = NULL WHERE goal_id = ?').run(id);
    return db.prepare('DELETE FROM goals WHERE id = ?').run(id).changes;
  })();
  if (removed === 0) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});

export { goals };
