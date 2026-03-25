import { Hono } from 'hono';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';

const tasks = new Hono();

// GET /tasks
tasks.get('/', (c) => {
  const db = getDb();
  const status = c.req.query('status');
  let query = 'SELECT * FROM tasks';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';
  return c.json(db.prepare(query).all(...params));
});

// GET /tasks/:id
tasks.get('/:id', (c) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(c.req.param('id'));
  if (!task) return c.json({ error: 'not found' }, 404);
  return c.json(task);
});

// POST /tasks
tasks.post('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const id = nanoid(12);

  db.prepare(`
    INSERT INTO tasks (id, conversation_id, title, description, assignee_id, assignee_name, expected_output, goal_id, parent_task_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, body.conversationId || null, body.title,
    body.description || null, body.assigneeId || null,
    body.assigneeName || null, body.expectedOutput || null,
    body.goalId || null, body.parentTaskId || null,
  );

  return c.json({ id }, 201);
});

// PATCH /tasks/:id
tasks.patch('/:id', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const sets: string[] = [];
  const vals: any[] = [];
  for (const [key, val] of Object.entries(body)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    sets.push(`${col} = ?`);
    vals.push(val);
  }
  sets.push("updated_at = datetime('now')");
  vals.push(c.req.param('id'));

  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return c.json({ ok: true });
});

export { tasks };
