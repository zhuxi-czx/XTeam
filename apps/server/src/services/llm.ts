/**
 * LLM Service — 抽象层
 * 支持 OpenAI 兼容 API (DashScope/阿里云) 和 Anthropic 直连
 * 流式响应 → SSE
 */

export interface LLMConfig {
  provider: string;  // 'openai-compat' | 'anthropic' | 'dashscope'
  model: string;
  apiKey?: string;
  baseUrl?: string;   // OpenAI 兼容 API 的 base URL
  agentId?: string;
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

// ========== Provider 配置 ==========
// 从环境变量读取，有合理默认值

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const DASHSCOPE_BASE_URL = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Agent provider → model 映射（和 seed data 对齐）
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; apiKey: string; defaultModel: string }> = {
  'dashscope': {
    baseUrl: DASHSCOPE_BASE_URL,
    apiKey: DASHSCOPE_API_KEY,
    defaultModel: 'qwen-plus',
  },
  'openai-compat': {
    baseUrl: DASHSCOPE_BASE_URL,
    apiKey: DASHSCOPE_API_KEY,
    defaultModel: 'qwen-plus',
  },
  'openclaw': {
    // 旧 Agent seed 用的 provider 名，fallback 到 DashScope
    baseUrl: DASHSCOPE_BASE_URL,
    apiKey: DASHSCOPE_API_KEY,
    defaultModel: 'qwen-plus',
  },
};

/**
 * OpenAI 兼容 API 调用（DashScope / 任何 OpenAI 兼容端点）
 */
async function callOpenAICompat(
  config: LLMConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const defaults = PROVIDER_DEFAULTS[config.provider] || PROVIDER_DEFAULTS['dashscope'];
  const baseUrl = config.baseUrl || defaults.baseUrl;
  const apiKey = config.apiKey || defaults.apiKey;
  const model = config.model || defaults.defaultModel;
  const url = `${baseUrl}/chat/completions`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API error [${model}]: ${res.status} ${errText.slice(0, 200)}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留未完成的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            callbacks.onChunk(delta);
          }
        } catch { /* ignore partial JSON */ }
      }
    }

    // 处理 buffer 中剩余的
    if (buffer.trim().startsWith('data: ')) {
      const data = buffer.trim().slice(6);
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            callbacks.onChunk(delta);
          }
        } catch { /* ignore */ }
      }
    }

    callbacks.onDone(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * 直接调用 Anthropic API
 */
async function callAnthropic(
  config: LLMConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');
  const apiKey = config.apiKey || ANTHROPIC_API_KEY;

  if (!apiKey) {
    callbacks.onError(new Error('Anthropic API key not configured'));
    return;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: chatMsgs.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic error: ${res.status} ${errText.slice(0, 200)}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
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
    case 'anthropic':
      return callAnthropic(config, messages, callbacks);
    case 'openai-compat':
    case 'dashscope':
    case 'openclaw':  // 向后兼容旧 seed data
    default:
      return callOpenAICompat(config, messages, callbacks);
  }
}
