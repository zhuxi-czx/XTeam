'use client'

interface ContextPanelProps {
  tasks: { title: string; status: string; color: string }[]
  agents: { name: string; status: string; color: string }[]
  goals: string[]
  memories: string[]
  decisions: string[]
}

export function ContextPanel({ tasks, agents, goals, memories, decisions }: ContextPanelProps) {
  return (
    <div className="w-80 overflow-auto p-5 space-y-6 border-l border-border/40">
      {/* 当前任务 */}
      <section>
        <h3 className="text-sm font-semibold mb-3">当前任务</h3>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.title} className="rounded-lg border border-border/40 px-3 py-2.5">
              <div className="text-sm font-medium">{task.title}</div>
              <div className={`text-xs ${task.color}`}>{task.status}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 当前参与 Agent */}
      <section>
        <h3 className="text-sm font-semibold mb-3">当前参与 Agent</h3>
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors">
              <div className={`h-8 w-8 rounded-full ${agent.color} flex items-center justify-center text-white text-xs`}>🤖</div>
              <div>
                <div className="text-sm font-medium">{agent.name}</div>
                <div className="text-xs text-muted-foreground">{agent.status}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 关联目标 */}
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

      {/* 相关记忆 */}
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
