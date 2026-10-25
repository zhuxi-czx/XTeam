'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CaretDown, Check, CircleNotch, Target } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { shortAgentName } from '@/lib/agent-style'
import { AgentAvatar } from '@/components/xt/primitives'
import { goalsApi, tasksApi, type Goal, type Task } from '@/lib/api'

const COLUMNS = [
  { key: 'queued', label: '排队中', dot: 'bg-ink-3', lane: 'bg-fill-2' },
  { key: 'running', label: '执行中', dot: 'bg-brand', lane: 'bg-gradient-to-b from-brand-soft to-fill-2 to-40%' },
  { key: 'completed', label: '已完成 🎉', dot: 'bg-success', lane: 'bg-fill-2' },
  { key: 'failed', label: '失败', dot: 'bg-danger', lane: 'bg-gradient-to-b from-danger-soft to-fill-2 to-40%' },
] as const

/** 'all' 全部；'none' 未关联目标；其余为目标 id */
type GoalFilter = 'all' | 'none' | string

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [filter, setFilter] = useState<GoalFilter>('all')

  useEffect(() => {
    const load = () => tasksApi.list().then(setTasks).catch(() => setTasks((t) => t ?? []))
    load()
    goalsApi.list().then(setGoals).catch(() => {})
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

  const goalById = new Map(goals.map((g) => [g.id, g]))
  const shown = tasks.filter((t) => (filter === 'all' ? true : filter === 'none' ? !t.goal_id : t.goal_id === filter))
  const running = shown.filter((t) => t.status === 'running').length

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 px-6 pb-4 pt-5">
        <h1 className="text-2xl font-semibold text-ink">任务</h1>
        <span className="text-sm text-ink-3">
          {shown.length} 个{running > 0 && ` · ${running} 个执行中`}
        </span>
        {goals.length > 0 && <GoalFilterMenu goals={goals} value={filter} onChange={setFilter} />}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-4 gap-3 px-6 pb-6">
        {COLUMNS.map((col) => {
          const list = shown.filter((t) => t.status === col.key)
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
                  list.map((t) => <TaskCard key={t.id} task={t} goal={t.goal_id ? goalById.get(t.goal_id) : undefined} />)
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function GoalFilterMenu({ goals, value, onChange }: { goals: Goal[]; value: GoalFilter; onChange: (v: GoalFilter) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const options: { key: GoalFilter; label: string }[] = [
    { key: 'all', label: '全部目标' },
    { key: 'none', label: '未关联目标' },
    ...goals.map((g) => ({ key: g.id, label: g.title })),
  ]
  const current = options.find((o) => o.key === value)?.label ?? '全部目标'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-7 max-w-[260px] items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors',
          value === 'all' ? 'bg-fill-2 text-ink-2 hover:text-ink' : 'bg-brand-soft text-brand-text',
        )}
      >
        <Target size={14} />
        <span className="truncate">{current}</span>
        <CaretDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-64 rounded-lg border border-line bg-surface p-1 shadow-[0_6px_18px_rgba(31,35,41,0.08)]">
          {options.map((o, i) => (
            <div key={o.key}>
              {i === 2 && <div className="mx-2.5 my-1 h-px bg-line-soft" />}
              <button
                type="button"
                onClick={() => {
                  onChange(o.key)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ink hover:bg-fill"
              >
                <span className="flex-1 truncate">{o.label}</span>
                {value === o.key && <Check size={14} className="text-brand" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, goal }: { task: Task; goal?: Goal }) {
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
      {goal && (
        <div className="flex min-w-0 items-center gap-1 border-t border-line-soft pt-2.5 text-xs text-ink-3">
          <Target size={12} className="shrink-0 text-brand" />
          <span className="truncate">{goal.title}</span>
        </div>
      )}
    </div>
  )
  return task.conversation_id ? <Link href={`/conversation?id=${task.conversation_id}`}>{card}</Link> : card
}
