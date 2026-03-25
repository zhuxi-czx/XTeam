'use client'

export interface TaskCardData {
  id: string
  title: string
  agentName: string
  agentColor: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: number
  expectedOutput?: string
}

const statusLabels: Record<string, { label: string; className: string }> = {
  queued: { label: '队列中', className: 'bg-gray-500/10 text-gray-400' },
  running: { label: '执行中', className: 'bg-blue-500/10 text-blue-500' },
  completed: { label: '已完成', className: 'bg-green-500/10 text-green-500' },
  failed: { label: '失败', className: 'bg-red-500/10 text-red-500' },
}

export function TaskCard({ task }: { task: TaskCardData }) {
  const statusInfo = statusLabels[task.status] || statusLabels.queued

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-violet-500/30 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{task.title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <div className={`h-5 w-5 rounded-full ${task.agentColor} flex items-center justify-center text-white text-[10px]`}>
          🤖
        </div>
        {task.agentName}
      </div>
      {task.expectedOutput && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">预计输出</span>
          <span className="text-muted-foreground">{task.expectedOutput}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">执行进度</span>
        <span className="font-medium">{task.progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-accent overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-500"
          style={{ width: `${task.progress}%` }}
        />
      </div>
    </div>
  )
}
