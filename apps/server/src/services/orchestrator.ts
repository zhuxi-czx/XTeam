/**
 * XTeam Orchestrator — 任务编排引擎
 * 简化版，复用 ClawMate V14 Orchestrator 的核心理念：
 * 1. 用户输入 → AI 规划 → 拆分子任务
 * 2. 按能力匹配 Agent → 并行执行
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
      content: `你是一个任务规划专家。用户会给你一个目标，你需要拆解为可执行的子任务。
每个子任务包含: title, description, capabilities（所需能力标签数组）。
返回 JSON 数组格式，不要其他内容。
示例: [{"title":"分析数据","description":"拉取近14天数据","capabilities":["data_analysis"]}]`,
    },
    { role: 'user', content: userGoal },
  ];

  let result = '';
  await chat(plannerConfig, messages, {
    onChunk: (chunk) => { result += chunk; },
    onDone: () => {},
    onError: (err) => { throw err; },
  });

  // 提取 JSON
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as SubtaskPlan[];
  } catch {
    return [];
  }
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

  // 兜底：任何在线 Agent
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
  goalId?: string;
  parentTaskId?: string;
}): string {
  const db = getDb();
  const id = nanoid(12);

  db.prepare(`
    INSERT INTO tasks (id, conversation_id, title, description, assignee_id, assignee_name, goal_id, parent_task_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.conversationId ?? null,
    params.title,
    params.description ?? null,
    params.assigneeId ?? null,
    params.assigneeName ?? null,
    params.goalId ?? null,
    params.parentTaskId ?? null,
  );

  return id;
}

/**
 * Step 4: 执行单个任务（调用 Agent）
 */
export async function executeTask(
  taskId: string,
  agentConfig: LLMConfig,
  prompt: string,
  onProgress: (progress: number, chunk: string) => void,
): Promise<string> {
  const db = getDb();

  // 标记开始
  db.prepare(`UPDATE tasks SET status = 'running', updated_at = datetime('now') WHERE id = ?`).run(taskId);

  let fullResult = '';
  let charCount = 0;

  await chat(agentConfig, [
    { role: 'system', content: '你是一个专业的执行 Agent。完成分配给你的任务，输出结构化结果。' },
    { role: 'user', content: prompt },
  ], {
    onChunk: (chunk) => {
      fullResult += chunk;
      charCount += chunk.length;
      // 模拟进度
      const progress = Math.min(95, Math.floor(charCount / 20));
      onProgress(progress, chunk);
      db.prepare(`UPDATE tasks SET progress = ?, updated_at = datetime('now') WHERE id = ?`).run(progress, taskId);
    },
    onDone: (text) => {
      fullResult = text;
      db.prepare(`
        UPDATE tasks SET status = 'completed', progress = 100, result = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(text, taskId);
    },
    onError: (err) => {
      db.prepare(`
        UPDATE tasks SET status = 'failed', result = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(err.message, taskId);
    },
  });

  // 更新 Agent 统计
  const task = db.prepare(`SELECT assignee_id FROM tasks WHERE id = ?`).get(taskId) as { assignee_id: string } | undefined;
  if (task?.assignee_id) {
    db.prepare(`UPDATE agents SET tasks_completed = tasks_completed + 1 WHERE id = ?`).run(task.assignee_id);
  }

  return fullResult;
}

/**
 * 完整编排流程：目标 → 规划 → 匹配 → 执行 → 汇总
 */
export async function orchestrate(params: {
  conversationId: string;
  userGoal: string;
  plannerConfig: LLMConfig;
  onTaskCreated: (taskId: string, title: string, agentName: string) => void;
  onTaskProgress: (taskId: string, progress: number, chunk: string) => void;
  onComplete: (results: { taskId: string; title: string; result: string }[]) => void;
}): Promise<void> {
  // 1. 规划
  const plans = await planTasks(params.userGoal, params.plannerConfig);
  if (plans.length === 0) {
    params.onComplete([]);
    return;
  }

  // 2. 创建任务 + 匹配 Agent
  const taskEntries: { taskId: string; plan: SubtaskPlan; agent: { id: string; name: string } }[] = [];

  for (const plan of plans) {
    const agent = matchAgent(plan.capabilities);
    if (!agent) continue;

    const taskId = createTask({
      conversationId: params.conversationId,
      title: plan.title,
      description: plan.description,
      assigneeId: agent.id,
      assigneeName: agent.name,
    });

    taskEntries.push({ taskId, plan, agent });
    params.onTaskCreated(taskId, plan.title, agent.name);
  }

  // 3. 并行执行
  const results = await Promise.allSettled(
    taskEntries.map(async ({ taskId, plan, agent }) => {
      const result = await executeTask(
        taskId,
        { ...params.plannerConfig, model: '' },  // TODO: 从 agent 配置取 model
        `任务: ${plan.title}\n描述: ${plan.description}`,
        (progress, chunk) => params.onTaskProgress(taskId, progress, chunk),
      );
      return { taskId, title: plan.title, result };
    })
  );

  // 4. 汇总
  const completed = results
    .filter((r): r is PromiseFulfilledResult<{ taskId: string; title: string; result: string }> => r.status === 'fulfilled')
    .map(r => r.value);

  params.onComplete(completed);
}
