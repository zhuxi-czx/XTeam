/**
 * XTeam Orchestrator — 任务编排引擎
 * 1. 用户输入 → AI 规划 → 拆分子任务
 * 2. 按能力匹配 Agent → 串行执行（避免并发限制）
 * 3. 汇总结果 → 反馈给用户
 */

import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';
import { chat, type LLMConfig, type ChatMessage } from './llm.js';

export interface SubtaskPlan {
  title: string;
  description: string;
  capabilities: string[];
}

/**
 * Step 1: AI 规划 — 把用户目标拆解为子任务
 */
export async function planTasks(
  userGoal: string,
  plannerConfig: LLMConfig,
): Promise<SubtaskPlan[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个任务规划专家。用户会给你一个目标，你需要拆解为 3-5 个可执行的子任务（不要超过5个）。
每个子任务包含: title, description, capabilities（所需能力标签数组）。
能力标签从这些中选择: content_planning, trend_analysis, data_analysis, reporting, monitoring, alerting, writing, seo, image_generation, design, competitive_analysis, research
返回纯 JSON 数组，不要 markdown 代码块，不要其他内容。
示例: [{"title":"分析数据","description":"拉取近14天数据并生成趋势报告","capabilities":["data_analysis"]}]`,
    },
    { role: 'user', content: userGoal },
  ];

  let result = '';
  
  return new Promise<SubtaskPlan[]>((resolve) => {
    chat(plannerConfig, messages, {
      onChunk: (chunk) => { result += chunk; },
      onDone: () => {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error('[Orchestrator] planTasks: no JSON found in result:', result.slice(0, 200));
          resolve([]);
          return;
        }
        try {
          const plans = JSON.parse(jsonMatch[0]) as SubtaskPlan[];
          console.log(`[Orchestrator] planTasks: ${plans.length} tasks planned`);
          resolve(plans);
        } catch (e) {
          console.error('[Orchestrator] planTasks: JSON parse error:', e);
          resolve([]);
        }
      },
      onError: (err) => {
        console.error('[Orchestrator] planTasks error:', err.message);
        resolve([]);
      },
    });
  });
}

/**
 * Step 2: 按能力匹配最佳 Agent
 */
export function matchAgent(
  capabilities: string[],
): { id: string; name: string } | null {
  const db = getDb();

  for (const cap of capabilities) {
    const agent = db.prepare(`
      SELECT id, name FROM agents
      WHERE status != 'offline'
        AND capabilities LIKE ?
      ORDER BY tasks_completed DESC
      LIMIT 1
    `).get(`%${cap}%`) as { id: string; name: string } | undefined;

    if (agent) return agent;
  }

  const fallback = db.prepare(`
    SELECT id, name FROM agents WHERE status = 'online' LIMIT 1
  `).get() as { id: string; name: string } | undefined;

  return fallback ?? null;
}

/**
 * Step 3: 创建任务并写入数据库
 */
export function createTask(params: {
  conversationId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
}): string {
  const db = getDb();
  const id = nanoid(12);

  db.prepare(`
    INSERT INTO tasks (id, conversation_id, title, description, assignee_id, assignee_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.conversationId ?? null,
    params.title,
    params.description ?? null,
    params.assigneeId ?? null,
    params.assigneeName ?? null,
  );

  return id;
}

/**
 * Step 4: 执行单个任务（调用 Agent LLM）
 */
export async function executeTask(
  taskId: string,
  agentConfig: LLMConfig,
  prompt: string,
  onProgress: (progress: number, chunk: string) => void,
): Promise<string> {
  const db = getDb();

  db.prepare(`UPDATE tasks SET status = 'running', updated_at = datetime('now') WHERE id = ?`).run(taskId);
  console.log(`[Orchestrator] executeTask ${taskId} starting (${agentConfig.provider}/${agentConfig.model})`);

  return new Promise<string>((resolve, reject) => {
    let fullResult = '';
    let charCount = 0;

    chat(agentConfig, [
      { role: 'system', content: '你是一个专业的执行 Agent。完成分配给你的任务，输出结构化、简洁的结果。控制在 300 字以内。' },
      { role: 'user', content: prompt },
    ], {
      onChunk: (chunk) => {
        fullResult += chunk;
        charCount += chunk.length;
        const progress = Math.min(95, Math.floor(charCount / 10));
        try { onProgress(progress, chunk); } catch { /* ignore callback errors */ }
        db.prepare(`UPDATE tasks SET progress = ?, updated_at = datetime('now') WHERE id = ?`).run(progress, taskId);
      },
      onDone: (text) => {
        fullResult = text;
        db.prepare(`
          UPDATE tasks SET status = 'completed', progress = 100, result = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(text, taskId);

        // 更新 Agent 统计
        const task = db.prepare(`SELECT assignee_id FROM tasks WHERE id = ?`).get(taskId) as { assignee_id: string } | undefined;
        if (task?.assignee_id) {
          db.prepare(`UPDATE agents SET tasks_completed = tasks_completed + 1 WHERE id = ?`).run(task.assignee_id);
        }

        console.log(`[Orchestrator] executeTask ${taskId} completed (${text.length} chars)`);
        resolve(fullResult);
      },
      onError: (err) => {
        console.error(`[Orchestrator] executeTask ${taskId} failed:`, err.message);
        db.prepare(`
          UPDATE tasks SET status = 'failed', result = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(err.message, taskId);
        reject(err);
      },
    });
  });
}

/**
 * 完整编排流程：目标 → 规划 → 匹配 → 串行执行 → 汇总
 * 回调全部容错：SSE 写入失败不中断执行
 */
export async function orchestrate(params: {
  conversationId: string;
  userGoal: string;
  plannerConfig: LLMConfig;
  onTaskCreated: (taskId: string, title: string, agentName: string) => void | Promise<void>;
  onTaskProgress: (taskId: string, progress: number, chunk: string) => void | Promise<void>;
  onComplete: (results: { taskId: string; title: string; result: string }[]) => void | Promise<void>;
}): Promise<void> {
  const db = getDb();

  // 1. 规划
  console.log(`[Orchestrator] planning for: "${params.userGoal}"`);
  const plans = await planTasks(params.userGoal, params.plannerConfig);
  if (plans.length === 0) {
    console.log('[Orchestrator] no plans generated, aborting');
    try { await params.onComplete([]); } catch {}
    return;
  }

  // 2. 创建任务 + 匹配 Agent
  const taskEntries: { taskId: string; plan: SubtaskPlan; agent: { id: string; name: string } }[] = [];

  for (const plan of plans) {
    const agent = matchAgent(plan.capabilities);
    if (!agent) {
      console.warn(`[Orchestrator] no agent found for capabilities: ${plan.capabilities}`);
      continue;
    }

    const taskId = createTask({
      conversationId: params.conversationId,
      title: plan.title,
      description: plan.description,
      assigneeId: agent.id,
      assigneeName: agent.name,
    });

    taskEntries.push({ taskId, plan, agent });
    try { await params.onTaskCreated(taskId, plan.title, agent.name); } catch (e) {
      console.warn('[Orchestrator] onTaskCreated callback error (ignored):', e);
    }
  }

  console.log(`[Orchestrator] ${taskEntries.length} tasks created, starting execution`);

  // 3. 串行执行（避免 DashScope 并发限制）
  const results: { taskId: string; title: string; result: string }[] = [];

  for (const { taskId, plan, agent } of taskEntries) {
    // 获取 Agent 的 LLM 配置
    const agentRow = db.prepare('SELECT provider, model FROM agents WHERE id = ?').get(agent.id) as any;
    const agentConfig: LLMConfig = {
      provider: agentRow?.provider || 'dashscope',
      model: agentRow?.model || 'qwen-plus',
    };

    try {
      const result = await executeTask(
        taskId,
        agentConfig,
        `任务: ${plan.title}\n描述: ${plan.description}`,
        (progress, chunk) => {
          try { params.onTaskProgress(taskId, progress, chunk); } catch {}
        },
      );
      results.push({ taskId, title: plan.title, result });
    } catch (err) {
      console.error(`[Orchestrator] task ${taskId} "${plan.title}" failed:`, err);
      results.push({ taskId, title: plan.title, result: `[执行失败] ${err}` });
    }
  }

  // 4. 汇总
  console.log(`[Orchestrator] all done: ${results.length} tasks processed`);
  try { await params.onComplete(results); } catch (e) {
    console.warn('[Orchestrator] onComplete callback error (ignored):', e);
  }
}
