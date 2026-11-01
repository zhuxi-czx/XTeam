# XTeam

人机协同平台（Human-Agent Collaborative Platform）。

人和多个 AI Agent 在同一个对话里协作：人提出目标，编排器把目标拆成任务，按能力分派给合适的 Agent 执行，结果汇总回对话；人负责定方向、做关键决策，并通过目标追踪整体进度。

> 当前是 v0.1 原型阶段：单用户、本地运行、核心链路「目标 → 任务 → Agent 执行」已打通。完整规划见 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 核心概念

| 概念 | 说明 |
|---|---|
| **对话 Conversation** | 协作的发生地。参与者可以是人（human）或 Agent（agent） |
| **Agent** | 有名字、能力标签（如 `writing`、`data_analysis`）和模型配置的 AI 成员 |
| **任务 Task** | 编排器从目标拆出的可执行单元，指派给一个 Agent，有状态和进度 |
| **目标 Goal** | 更长期的结果。任务关联到目标，目标进度 = 已完成任务 / 全部任务 |
| **决策 Decision** | 需要人拍板的节点（已建模，尚未实现） |
| **记忆 Memory** | Agent 从对话和任务中沉淀的知识（已建模，尚未实现） |

## 现在能做什么

- **工作台**：输入一句目标直接发起编排，可选关联到某个目标；查看需要处理的失败任务和最近完成的任务
- **对话**：和 AI 聊天，或开启「自动编排」把一句话拆成 3–5 个任务，实时看到每个 Agent 的执行进度和最终总结
- **任务看板**：排队中 / 执行中 / 已完成 / 失败四栏，可按目标筛选，点卡片回到所在对话
- **目标**：创建、暂停、删除目标；进度由关联任务实时计算；对话可以随时关联或更换目标
- **Agent**：查看 6 个内置 Agent 的能力和工作状态

## 快速开始

需要 Node.js 20+ 和 pnpm。

```bash
pnpm install

# 1. 配置模型密钥（阿里云百炼 DashScope）
cp apps/server/.env.example apps/server/.env
# 编辑 apps/server/.env，填入 DASHSCOPE_API_KEY

# 2. 启动后端（http://localhost:3100）
pnpm --filter @xteam/server dev

# 3. 另开终端启动前端（http://localhost:3000）
NEXT_PUBLIC_API_URL=http://localhost:3100 pnpm --filter web dev
```

首次启动会在 `apps/server/data/xteam.db` 创建 SQLite 数据库并写入 6 个默认 Agent。

## 技术栈

- **前端** `apps/web`：Next.js 16（App Router, Turbopack）、React 19、Tailwind CSS v4、shadcn/ui、Phosphor Icons；界面遵循飞书设计语言
- **后端** `apps/server`：Hono、better-sqlite3、SSE 流式输出
- **模型**：OpenAI 兼容接口，默认通义千问 `qwen-plus`（DashScope）
- **Monorepo**：pnpm workspace

## 目录结构

```
apps/
  web/        Next.js 前端
  server/     Hono API + 编排引擎 + SQLite
packages/
  core/       领域模型类型定义（整个平台的数据模型蓝图）
  db/  ui/    预留，尚未使用
design/       Pencil 设计稿
docs/         架构与规划文档
```

## 文档

- [架构说明](docs/ARCHITECTURE.md)：系统结构、数据模型、编排流程、API
- [规划路线](docs/ROADMAP.md)：已完成、进行中和待做的部分，以及已知问题
