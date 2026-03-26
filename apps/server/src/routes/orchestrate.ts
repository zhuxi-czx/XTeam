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
  }>();

  const db = getDb();

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
      userGoal: body.goal,
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

        // 保存汇总消息
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_type, sender_name, content, content_type)
          VALUES (?, ?, 'system', 'system', '编排引擎', ?, 'insight')
        `).run(nanoid(12), body.conversationId, `## 🎯 编排完成\n\n${summary}`);

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
