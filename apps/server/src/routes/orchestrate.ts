import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';
import { orchestrate } from '../services/orchestrator.js';
import type { LLMConfig } from '../services/llm.js';

const orchestrateRouter = new Hono();

/**
 * POST /orchestrate — 启动编排
 * body: { conversationId, goal }
 * 返回 SSE 流，实时推送任务创建/进度/完成事件
 */
orchestrateRouter.post('/', async (c) => {
  const body = await c.req.json<{
    conversationId: string;
    goal: string;
    goalId?: string;
  }>();

  const db = getDb();

  // 关联目标：校验存在，并把目标标题/说明作为规划的背景
  const linkedGoal = body.goalId
    ? (db.prepare('SELECT id, title, description FROM goals WHERE id = ?').get(body.goalId) as
        | { id: string; title: string; description: string | null }
        | undefined)
    : undefined;
  if (body.goalId && !linkedGoal) return c.json({ error: 'goal not found' }, 404);

  const plannerInput = linkedGoal
    ? `${body.goal}\n\n（这是目标「${linkedGoal.title}」下的一项工作${linkedGoal.description ? `。目标说明：${linkedGoal.description}` : ''}）`
    : body.goal;

  // 保存用户目标消息
  const goalMsgId = nanoid(12);
  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, sender_type, sender_name, content, content_type)
    VALUES (?, ?, 'user', 'human', '创始人 · 张轩', ?, 'text')
  `).run(goalMsgId, body.conversationId, `🎯 编排目标：${body.goal}`);

  const plannerConfig: LLMConfig = {
    provider: 'dashscope',
    model: 'qwen-plus',
  };

  console.log(`[Orchestrate Route] goal="${body.goal}" conv=${body.conversationId}`);

  return streamSSE(c, async (stream) => {
    // 安全写入 SSE（连接断开不抛错）
    const safeSend = async (data: object) => {
      try {
        await stream.writeSSE({
          data: JSON.stringify(data),
          event: 'orchestrate',
        });
      } catch (e) {
        // 客户端可能已断开，忽略
      }
    };

    await safeSend({ type: 'orchestrate:start', goal: body.goal });

    await orchestrate({
      conversationId: body.conversationId,
      userGoal: plannerInput,
      goalId: linkedGoal?.id,
      plannerConfig,

      onTaskCreated: async (taskId, title, agentName) => {
        await safeSend({ type: 'task:created', taskId, title, agentName });

        // 写系统消息到对话
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_type, sender_name, content, content_type, metadata)
          VALUES (?, ?, 'system', 'system', '编排引擎', ?, 'task_card', ?)
        `).run(
          nanoid(12),
          body.conversationId,
          `📋 任务创建：${title}\n🤖 分配给：${agentName}`,
          JSON.stringify({ taskId, agentName }),
        );
      },

      onTaskProgress: async (taskId, progress, _chunk) => {
        // 只每 20% 发一次进度，减少 SSE 流量
        if (progress % 20 === 0 || progress >= 95) {
          await safeSend({ type: 'task:progress', taskId, progress });
        }
      },

      onComplete: async (results) => {
        const summary = results.map(r =>
          `### ${r.title}\n${r.result?.slice(0, 300) || '(无输出)'}`
        ).join('\n\n---\n\n');

        // 保存汇总消息；一个任务都没拆出来（多为模型调用失败）时，留一条说明而不是空汇总
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_type, sender_name, content, content_type)
          VALUES (?, ?, 'system', 'system', '编排引擎', ?, ?)
        `).run(
          nanoid(12),
          body.conversationId,
          results.length > 0 ? `## 🎯 编排完成\n\n${summary}` : '这次没能拆出任务，可能是模型服务出错了，稍后再试一次。',
          results.length > 0 ? 'insight' : 'text',
        );

        db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
          .run(body.conversationId);

        await safeSend({
          type: 'orchestrate:done',
          taskCount: results.length,
          summary: summary.slice(0, 2000),
        });
      },
    });
  });
});

export { orchestrateRouter };
