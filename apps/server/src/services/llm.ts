/**
 * LLM Service — 抽象层
 * 支持 OpenClaw Gateway 或直接 API 调用
 * 流式响应 → SSE
 */

export interface LLMConfig {
  provider: string;  // 'openclaw' | 'anthropic' | 'openai' | 'qwen'
  model: string;
  apiKey?: string;
  gatewayUrl?: string;  // OpenClaw Gateway URL
  agentId?: string;     // OpenClaw agent ID
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * 通过 OpenClaw Gateway 发送消息（复用现有基础设施）
 */
async function callOpenClaw(
  config: LLMConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const url = `${config.gatewayUrl || 'http://127.0.0.1:18789'}/v1/chat/completions`;
  const lastMsg = messages[messages.length - 1];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Gateway error: ${res.status} ${await res.text()}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              callbacks.onChunk(delta);
            }
          } catch { /* ignore parse errors in stream */ }
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * 直接调用 Anthropic API（不依赖 OpenClaw）
 */
async function callAnthropic(
  config: LLMConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: systemMsg?.content,
        messages: chatMsgs.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'content_block_delta') {
              const delta = parsed.delta?.text;
              if (delta) {
                fullText += delta;
                callbacks.onChunk(delta);
              }
            }
          } catch { /* ignore */ }
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * 统一调用入口
 */
export async function chat(
  config: LLMConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  switch (config.provider) {
    case 'openclaw':
      return callOpenClaw(config, messages, callbacks);
    case 'anthropic':
      return callAnthropic(config, messages, callbacks);
    default:
      // 默认走 OpenClaw 兼容接口
      return callOpenClaw(config, messages, callbacks);
  }
}
