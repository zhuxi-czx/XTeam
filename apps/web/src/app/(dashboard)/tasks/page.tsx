'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { shortAgentName } from '@/lib/agent-style'
import { AgentAvatar } from '@/components/xt/primitives'
import { tasksApi, type Task } from '@/lib/api'

const COLUMNS = [
  { key: 'queued', label: '排队中', dot: 'bg-ink-3', lane: 'bg-fill-2' },
  { key: 'running', label: '执行中', dot: 'bg-brand', lane: 'bg-gradient-to-b from-brand-soft to-fill-2 to-40%' },
  { key: 'completed', label: '已完成 🎉', dot: 'bg-success', lane: 'bg-fill-2' },
  { key: 'failed', label: '失败', dot: 'bg-danger', lane: 'bg-gradient-to-b from-danger-soft to-fill-2 to-40%' },
] as const

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null)

  useEffect(() => {
    const load = () => tasksApi.list().then(setTasks).catch(() => setTasks((t) => t ?? []))
    load()
    // 执行中的任务会持续变化，定时刷新
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

  if (!tasks) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <CircleNotch size={24} className="animate-spin text-brand" />
      </div>
    )
  }

  const running = tasks.filter((t) => t.status === 'running').length

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-baseline gap-3 px-6 pb-4 pt-5">
        <h1 className="text-2xl font-semibold text-ink">任务</h1>
        <span className="text-sm text-ink-3">
          {tasks.length} 个{running > 0 && ` · ${running} 个执行中`}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-4 gap-3 px-6 pb-6">
        {COLUMNS.map((col) => {
          const list = tasks.filter((t) => t.status === col.key)
          return (
            <section key={col.key} className={cn('flex min-h-0 flex-col gap-2 rounded-xl p-2', col.lane)}>
              <div className="flex items-center gap-2 px-2 py-1">
                <span className={cn('size-2 rounded-full', col.dot)} />
                <span className="text-sm font-semibold text-ink">{col.label}</span>
                <span className="text-xs text-ink-3">{list.length}</span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto">
                {list.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-ink-3">空空如也</p>
                ) : (
                  list.map((t) => <TaskCard key={t.id} task={t} />)
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: Task }) {
  const running = task.status === 'running'
  const failed = task.status === 'failed'
  const card = (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-surface p-3.5 transition-colors',
        running ? 'border-brand-line' : failed ? 'border-danger-line' : 'border-transparent hover:border-line',
      )}
    >
      <p className="line-clamp-2 text-sm font-semibold text-ink">{task.title}</p>
      {running && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-fill-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${task.progress}%` }} />
          </div>
          <span className="text-xs tabular-nums text-ink-2">{task.progress}%</span>
        </div>
      )}
      {failed && task.result && <p className="line-clamp-2 rounded-md bg-danger-soft px-2.5 py-1.5 text-xs text-danger-text">{task.result}</p>}
      {task.assignee_name && (
        <div className="flex items-center gap-2">
          <AgentAvatar name={task.assignee_name} size={20} />
          <span className="truncate text-xs text-ink-2">{shortAgentName(task.assignee_name)}</span>
        </div>
      )}
    </div>
  )
  return task.conversation_id ? <Link href={`/conversation?id=${task.conversation_id}`}>{card}</Link> : card
}
