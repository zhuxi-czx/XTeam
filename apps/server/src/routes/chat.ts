import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';
import { chat, type LLMConfig, type ChatMessage } from '../services/llm.js';

const chatRouter = new Hono();

/**
 * POST /chat/:conversationId/send — 发送消息 + 流式 AI 回复
 */
chatRouter.post('/:conversationId/send', async (c) => {
  const conversationId = c.req.param('conversationId');
  const body = await c.req.json<{
    content: string;
    senderName: string;
    agentId?: string;
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

  // 3. 获取 Agent 配置 → LLM 配置
  let agentConfig: LLMConfig = {
    provider: 'dashscope',
    model: 'qwen-plus',
  };
  let agentName = 'AI 助手';

  if (body.agentId) {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(body.agentId) as any;
    if (agent) {
      agentName = agent.name;
      agentConfig = {
        provider: agent.provider || 'dashscope',
        model: agent.model || 'qwen-plus',
      };
    }
  }

  // 4. 添加 system prompt
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `你是「${agentName}」，XTeam 人机协同平台中的一个专业 AI Agent。
用中文回答，保持专业、简洁。如果用户的问题与你的专长无关，仍然友好地回答。`,
  };

  const fullMessages = [systemMessage, ...messages];

  console.log(`[Chat] conv=${conversationId} agent=${agentName} provider=${agentConfig.provider} model=${agentConfig.model}`);

  // 5. 流式返回
  return streamSSE(c, async (stream) => {
    const aiMsgId = nanoid(12);

    await stream.writeSSE({ data: JSON.stringify({ type: 'start', msgId: aiMsgId }), event: 'message' });

    await chat(agentConfig, fullMessages, {
      onChunk: async (chunk) => {
        await stream.writeSSE({ data: JSON.stringify({ type: 'chunk', content: chunk }), event: 'message' });
      },
      onDone: async (text) => {
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_type, sender_name, content)
          VALUES (?, ?, ?, 'agent', ?, ?)
        `).run(aiMsgId, conversationId, body.agentId || 'default', agentName, text);

        db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);

        await stream.writeSSE({ data: JSON.stringify({ type: 'done', msgId: aiMsgId, content: text }), event: 'message' });
      },
      onError: async (err) => {
        console.error(`[Chat Error]`, err.message);
        await stream.writeSSE({ data: JSON.stringify({ type: 'error', error: err.message }), event: 'message' });
      },
    });
  });
});

export { chatRouter };
