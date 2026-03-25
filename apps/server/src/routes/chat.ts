import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';
import { chat, type LLMConfig, type ChatMessage } from '../services/llm.js';

const chatRouter = new Hono();

/**
 * POST /chat/:conversationId/send — 发送消息 + 流式 AI 回复
 * 前端通过 SSE 接收流式响应
 */
chatRouter.post('/:conversationId/send', async (c) => {
  const conversationId = c.req.param('conversationId');
  const body = await c.req.json<{
    content: string;
    senderName: string;
    agentId?: string;  // 指定回复的 Agent，不指定则用默认
  }>();
  const db = getDb();

  // 1. 保存用户消息
  const userMsgId = nanoid(12);
  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, sender_type, sender_name, content)
    VALUES (?, ?, 'user', 'human', ?, ?)
  `).run(userMsgId, conversationId, body.senderName, body.content);

  // 2. 获取对话历史（最近 20 条）
  const history = db.prepare(`
    SELECT sender_type, sender_name, content FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC LIMIT 20
  `).all(conversationId) as { sender_type: string; sender_name: string; content: string }[];

  const messages: ChatMessage[] = history.reverse().map(m => ({
    role: m.sender_type === 'human' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }));

  // 3. 获取 Agent 配置
  let agentConfig: LLMConfig = {
    provider: 'openclaw',
    model: 'claude-sonnet-4-20250514',
    gatewayUrl: 'http://127.0.0.1:18789',
  };

  if (body.agentId) {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(body.agentId) as any;
    if (agent) {
      agentConfig = {
        provider: agent.provider,
        model: agent.model,
        gatewayUrl: 'http://127.0.0.1:18789',
      };
    }
  }

  // 4. 流式返回
  return streamSSE(c, async (stream) => {
    const aiMsgId = nanoid(12);
    let fullText = '';

    // 发送 msg_id
    await stream.writeSSE({ data: JSON.stringify({ type: 'start', msgId: aiMsgId }), event: 'message' });

    await chat(agentConfig, messages, {
      onChunk: async (chunk) => {
        fullText += chunk;
        await stream.writeSSE({ data: JSON.stringify({ type: 'chunk', content: chunk }), event: 'message' });
      },
      onDone: async (text) => {
        // 保存 AI 消息
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_type, sender_name, content)
          VALUES (?, ?, ?, 'agent', 'AI 助手', ?)
        `).run(aiMsgId, conversationId, body.agentId || 'default', text);

        db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);

        await stream.writeSSE({ data: JSON.stringify({ type: 'done', msgId: aiMsgId, content: text }), event: 'message' });
      },
      onError: async (err) => {
        await stream.writeSSE({ data: JSON.stringify({ type: 'error', error: err.message }), event: 'message' });
      },
    });
  });
});

export { chatRouter };
