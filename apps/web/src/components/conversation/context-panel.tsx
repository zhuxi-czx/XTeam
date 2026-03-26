'use client'

interface TaskItem {
  title: string
  status: string
  progress?: number
  agentName?: string
}

interface ContextPanelProps {
  tasks: TaskItem[]
  agents: { name: string; status: string; color: string }[]
  goals: string[]
  memories: string[]
  decisions: string[]
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  queued: { label: '排队中', color: 'text-zinc-400', bg: 'bg-zinc-500/20' },
  running: { label: '执行中', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  completed: { label: '已完成', color: 'text-green-400', bg: 'bg-green-500/20' },
  failed: { label: '失败', color: 'text-red-400', bg: 'bg-red-500/20' },
  cancelled: { label: '已取消', color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
}

export function ContextPanel({ tasks, agents, goals, memories, decisions }: ContextPanelProps) {
  return (
    <div className="w-80 overflow-auto p-5 space-y-6 border-l border-border/40">
      {/* 任务看板 */}
      <section>
        <h3 className="text-sm font-semibold mb-3">
          任务 <span className="text-muted-foreground font-normal">({tasks.length})</span>
        </h3>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无任务。输入 <code className="bg-muted px-1 rounded">/目标</code> 启动编排</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const sc = statusConfig[task.status] || statusConfig.queued
              return (
                <div key={task.title} className="rounded-lg border border-border/40 px-3 py-2.5">
                  <div className="text-sm font-medium mb-1">{task.title}</div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    {task.agentName && (
                      <span className="text-xs text-muted-foreground">🤖 {task.agentName}</span>
                    )}
                  </div>
                  {task.status === 'running' && task.progress !== undefined && (
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Agent 列表 */}
      <section>
        <h3 className="text-sm font-semibold mb-3">Agent</h3>
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors">
              <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center text-sm">🤖</div>
              <div>
                <div className="text-sm font-medium">{agent.name}</div>
                <div className="text-xs text-muted-foreground">{agent.status}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 目标 */}
      <section>
        <h3 className="text-sm font-semibold mb-3">关联目标</h3>
        <div className="space-y-1.5">
          {goals.map((goal) => (
            <div key={goal} className="rounded-lg bg-violet-500/5 border border-violet-500/10 px-3 py-2 text-sm text-violet-400">
              {goal}
            </div>
          ))}
        </div>
      </section>

      {/* 记忆 */}
      <section>
        <h3 className="text-sm font-semibold mb-3">相关记忆</h3>
        <div className="space-y-1.5">
          {memories.map((mem) => (
            <div key={mem} className="rounded-lg bg-accent/30 px-3 py-2 text-xs text-muted-foreground">
              {mem}
            </div>
          ))}
        </div>
      </section>

      {/* 待决策 */}
      {decisions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3">待决策</h3>
          <div className="space-y-2">
            {decisions.map((decision) => (
              <div key={decision} className="rounded-lg border border-border/40 px-3 py-2.5">
                <div className="text-sm mb-2">{decision}</div>
                <div className="flex gap-2">
                  <button className="rounded-md bg-violet-600 px-3 py-1 text-xs text-white hover:bg-violet-700 transition-colors">确认</button>
                  <button className="rounded-md bg-accent px-3 py-1 text-xs text-muted-foreground hover:bg-accent/80 transition-colors">稍后</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
